import express, { Request, Response } from 'express';
import {
    ChainRestAuthApi,
    MsgExecuteContract,
    MsgSend,
    createTransactionFromMsg,
    TxRestApi,
    TxClient,
    BroadcastMode
} from "@injectivelabs/sdk-ts";
import { BigNumberInBase } from "@injectivelabs/utils";
import { Network, getNetworkEndpoints } from "@injectivelabs/networks";
import { logger } from '../utils/logger';

const router = express.Router();

// Configuration - updated for Injective testnet
const NETWORK = Network.TestnetK8s;
const CHAIN_ID = 'injective-888'; // Correct testnet chain ID
const CONTRACT_ADDRESS = 'inj1wdx4lnl4amctfgwgujhepf7tjn3ygk37a3sgfj';
const USDT_DENOM = 'peggy0x87aB3B4C8661e07D6372361211B96ed4Dc36B1B5';
const INJ_DENOM = 'inj';

// Get network endpoints
const ENDPOINTS = getNetworkEndpoints(NETWORK);
const REST_ENDPOINT = ENDPOINTS.rest;

// Types
interface PrepareSwapRequest {
    amount: number;
    walletAddress: string;
    pubKey: string;
}

interface PrepareSendRequest {
    amount: number;
    walletAddress: string;
    pubKey: string;
    destinationAddress: string; 
}

interface BroadcastTxRequest {
    signedTxData: {
        txRaw: {
            bodyBytes: string;
            authInfoBytes: string;
            signatures: string[];
        };
    };
}

// Helper function to properly process the public key from frontend
const processPubKey = (pubKeyBase64: string): string => {
    try {
        // The pubKey should already be in base64 format from the frontend
        logger.info(`Processing pubKey with length: ${pubKeyBase64.length}`);
        
        // Return just the base64 string as required by SDK
        return pubKeyBase64;
    } catch (error: any) {
        logger.error(`Error processing pubKey: ${error.message}`);
        throw new Error(`Invalid public key format: ${error.message}`);
    }
};

// Endpoint to prepare a simple INJ transfer transaction
router.post('/prepare-send', async (req: Request, res: Response) => {
    try {
        const { amount, walletAddress, pubKey, destinationAddress } = req.body as PrepareSendRequest;
        
        if (!amount || amount <= 0 || !walletAddress || !pubKey) {
            return res.status(400).json({ 
                error: 'Invalid request. Must provide amount, walletAddress, and pubKey' 
            });
        }

        if (!destinationAddress) {
            return res.status(400).json({
                error: 'Destination address is required'
            });
        }

        logger.info(`Preparing INJ transfer: ${amount} INJ from ${walletAddress} to ${destinationAddress}`);
        logger.info(`Using pubKey: ${pubKey.substring(0, 20)}...`);

        // Convert amount to proper decimals (INJ has 18 decimals)
        const amountInBaseUnits = new BigNumberInBase(amount)
            .times(new BigNumberInBase(10).pow(18))
            .toFixed();

        // Create a simple transfer message
        const msg = MsgSend.fromJSON({
            amount: {
                amount: amountInBaseUnits,
                denom: INJ_DENOM
            },
            srcInjectiveAddress: walletAddress,
            dstInjectiveAddress: destinationAddress,
        });

        // Get account details - fetch fresh for each transaction
        logger.info(`Fetching account details for ${walletAddress}`);
        const chainRestAuthApi = new ChainRestAuthApi(REST_ENDPOINT);
        const accountDetailsResponse = await chainRestAuthApi.fetchAccount(walletAddress);
        
        logger.info(`Account structure: ${JSON.stringify(accountDetailsResponse)}`);
        
        // Extract account info
        const baseAccount = accountDetailsResponse.account.base_account;
        const accountNumber = baseAccount.account_number;
        const sequence = baseAccount.sequence;
        
        logger.info(`Account details: account number ${accountNumber}, sequence ${sequence}`);

        // Standard fee
        const fee = {
            amount: [
                {
                    denom: INJ_DENOM,
                    amount: '5000000000000000', // 0.005 INJ
                },
            ],
            gas: '100000', // 100,000 gas units
        };

        // Process the public key from frontend
        const processedPubKey = processPubKey(pubKey);

        // Create the transaction with the processed pubKey
        logger.info(`Creating transaction with chainId: ${CHAIN_ID}, account: ${accountNumber}, sequence: ${sequence}`);
        const { txRaw, signDoc } = createTransactionFromMsg({
            pubKey: processedPubKey,
            chainId: CHAIN_ID,
            fee,
            message: msg,
            sequence: parseInt(sequence, 10),
            accountNumber: parseInt(accountNumber, 10),
            timeoutHeight: 0
        });

        logger.info(`Transaction prepared successfully, returning to client`);
        
        return res.status(200).json({
            txData: {
                bodyBytes: Buffer.from(txRaw.bodyBytes).toString('base64'),
                authInfoBytes: Buffer.from(txRaw.authInfoBytes).toString('base64'),
                accountNumber: accountNumber.toString(),
                chainId: CHAIN_ID,
                sequence: sequence.toString()
            },
            sendInfo: {
                fromAddress: walletAddress,
                toAddress: destinationAddress,
                amount: amount,
                denom: INJ_DENOM
            },
            fee
        });
    } catch (error: any) {
        logger.error(`Failed to prepare send transaction: ${error.message || 'Unknown error'}`);
        logger.error(`Error stack: ${error.stack || 'No stack trace'}`);
        return res.status(500).json({ error: `Failed to prepare send: ${error.message || 'Unknown error'}` });
    }
});

// Endpoint to prepare a swap transaction
router.post('/prepare-swap', async (req: Request, res: Response) => {
    try {
        const { amount, walletAddress, pubKey } = req.body as PrepareSwapRequest;
        logger.info(`Preparing swap transaction request received: amount=${amount}, wallet=${walletAddress}, pubKey provided: ${!!pubKey}`);

        if (!amount || amount <= 0 || !walletAddress) {
            logger.error(`Invalid request parameters: ${JSON.stringify(req.body)}`);
            return res.status(400).json({ 
                error: 'Invalid request. Must provide amount and walletAddress' 
            });
        }

        if (!pubKey) {
            logger.error('Public key is required');
            return res.status(400).json({
                error: 'Public key is required for transaction creation'
            });
        }

        logger.info(`Preparing swap transaction for ${walletAddress}, amount: ${amount} USDT`);

        // Convert amount to proper decimals (USDT has 6 decimals)
        const amountInBaseUnits = new BigNumberInBase(amount)
            .times(new BigNumberInBase(10).pow(6))
            .toFixed();

        // Prepare the swap message
        const msg = MsgExecuteContract.fromJSON({
            sender: walletAddress,
            contractAddress: CONTRACT_ADDRESS,
            msg: {
                swap_min_output: {
                    target_denom: INJ_DENOM,
                    min_output_quantity: "0.05"
                }
            },
            funds: [{ 
                denom: USDT_DENOM, 
                amount: amountInBaseUnits
            }]
        });

        // Get fresh account details for each transaction
        logger.info(`Fetching account details for ${walletAddress}`);
        const chainRestAuthApi = new ChainRestAuthApi(REST_ENDPOINT);
        const accountDetailsResponse = await chainRestAuthApi.fetchAccount(walletAddress);
        
        logger.info(`Account structure: ${JSON.stringify(accountDetailsResponse)}`);
        
        // Extract account info
        const baseAccount = accountDetailsResponse.account.base_account;
        const accountNumber = baseAccount.account_number;
        const sequence = baseAccount.sequence;
        
        logger.info(`Account details: account number ${accountNumber}, sequence ${sequence}`);

        // Standard gas and fees for swap
        const fee = {
            amount: [
                {
                    denom: 'inj',
                    amount: '5000000000000000', // 0.005 INJ
                },
            ],
            gas: '2000000', // 2,000,000 gas units
        };

        // Process the public key from frontend
        const processedPubKey = processPubKey(pubKey);

        // Create the transaction with the processed pubKey
        logger.info(`Creating transaction with chainId: ${CHAIN_ID}, account: ${accountNumber}, sequence: ${sequence}`);
        const { txRaw, signDoc } = createTransactionFromMsg({
            pubKey: processedPubKey,
            chainId: CHAIN_ID,
            fee,
            message: msg,
            sequence: parseInt(sequence, 10),
            accountNumber: parseInt(accountNumber, 10),
            timeoutHeight: 0
        });

        logger.info(`Transaction prepared successfully, returning to client`);
        
        return res.status(200).json({
            txData: {
                bodyBytes: Buffer.from(txRaw.bodyBytes).toString('base64'),
                authInfoBytes: Buffer.from(txRaw.authInfoBytes).toString('base64'),
                accountNumber: accountNumber.toString(),
                chainId: CHAIN_ID,
                sequence: sequence.toString()
            },
            swapInfo: {
                fromAddress: walletAddress,
                contractAddress: CONTRACT_ADDRESS,
                amount: amount,
                denom: USDT_DENOM
            },
            fee
        });
    } catch (error: any) {
        logger.error(`Failed to prepare swap transaction: ${error.message || 'Unknown error'}`);
        logger.error(`Error stack: ${error.stack || 'No stack trace'}`);
        return res.status(500).json({ error: `Failed to prepare swap: ${error.message || 'Unknown error'}` });
    }
});

// Endpoint to broadcast a signed transaction
router.post('/broadcast-tx', async (req: Request, res: Response) => {
    try {
        const { signedTxData } = req.body as BroadcastTxRequest;
        logger.info(`Received broadcast request`);

        if (!signedTxData || !signedTxData.txRaw) {
            logger.error(`Missing required fields in request: ${JSON.stringify(req.body)}`);
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid transaction data: Missing required fields' 
            });
        }

        try {
            // Prepare the txRaw object
            const { txRaw } = signedTxData;
            
            logger.info(`Preparing signed transaction for broadcast`);
            const signedTxRaw = {
                bodyBytes: Buffer.from(txRaw.bodyBytes, 'base64'),
                authInfoBytes: Buffer.from(txRaw.authInfoBytes, 'base64'),
                signatures: txRaw.signatures.map(sig => Buffer.from(sig, 'base64')),
            };

            // Try to calculate transaction hash
            if (TxClient.hash) {
                try {
                    const txHash = TxClient.hash(signedTxRaw);
                    logger.info(`Transaction Hash: ${txHash}`);
                } catch (hashError: any) {
                    logger.warn(`Could not calculate transaction hash: ${hashError.message}`);
                }
            }

            // Use TxRestApi for broadcasting
            const txClient = new TxRestApi(REST_ENDPOINT);
            logger.info(`Broadcasting transaction via REST to ${REST_ENDPOINT}`);
            
            // Try simulation first if available
            try {
                if (txClient.simulate) {
                    const simulation = await txClient.simulate(signedTxRaw);
                    logger.info(`Simulation successful: ${JSON.stringify(simulation)}`);
                }
            } catch (simError: any) {
                logger.warn(`Simulation failed: ${simError.message}, will try broadcasting anyway`);
            }
            
            // Broadcast the transaction
            const txResponse = await txClient.broadcast(signedTxRaw);
            
            logger.info(`Broadcast response: ${JSON.stringify(txResponse)}`);
            
            if (txResponse && txResponse.txHash) {
                logger.info(`Transaction successful: ${txResponse.txHash}`);
                return res.status(200).json({
                    success: true,
                    txHash: txResponse.txHash,
                });
            } else {
                logger.error(`Transaction failed: ${JSON.stringify(txResponse)}`);
                return res.status(500).json({ 
                    success: false, 
                    error: `Transaction failed: ${txResponse.rawLog || 'Unknown error'}` 
                });
            }
        } catch (broadcastError: any) {
            logger.error(`Error during broadcast: ${broadcastError.message || 'Unknown error'}`);
            logger.error(`Full broadcast error: ${JSON.stringify(broadcastError, Object.getOwnPropertyNames(broadcastError))}`);
            return res.status(500).json({ 
                success: false, 
                error: `Error during broadcast: ${broadcastError.message || 'Unknown error'}` 
            });
        }
    } catch (error: any) {
        logger.error(`Failed to process broadcast request: ${error.message || 'Unknown error'}`);
        logger.error(`Error stack: ${error.stack || 'No stack trace'}`);
        return res.status(500).json({ 
            success: false, 
            error: `Failed to process broadcast request: ${error.message || 'Unknown error'}` 
        });
    }
});

// CORS middleware for API routes
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

export default router;