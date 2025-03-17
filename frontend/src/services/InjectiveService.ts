// src/services/InjectiveService.ts
import axios from 'axios';
import { Buffer } from 'buffer';

export interface TransactionStatus {
  success: boolean;
  height?: string;
  gasUsed?: string;
  timestamp?: string;
  error?: string;
}

interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

// Interface for Keplr Account
interface KeplrAccount {
  address: string;
  algo: string;
  pubkey: Uint8Array;
}

// Interface for SendTxOptions
interface SendTxOptions {
  memo?: string;
  fee?: any;
  feeDenom?: string;
}

const API_BASE_URL =  'http://localhost:8000/api/dca';

class InjectiveService {
  private chainId = 'injective-888';
  
  /**
   * Send a transaction through Keplr wallet and backend API
   */
  async sendTransaction(
    amount: number,
    fromAddress: string,
    toAddress: string
  ): Promise<TransactionResult> {
    try {
      // Step 1: Check if Keplr is installed
      if (!window.keplr) {
        throw new Error("Keplr wallet extension is not installed");
      }

      // Step 2: Enable Keplr for Injective testnet chain
      await window.keplr.enable(this.chainId);
      
      // Step 3: Get the wallet's public key using getOfflineSigner and getAccounts
      const offlineSigner = window.keplr.getOfflineSigner(this.chainId);
      const accounts = await offlineSigner.getAccounts();
      
      if (accounts.length === 0) {
        throw new Error("No accounts found in Keplr wallet");
      }
      
      const account = accounts[0];
      const pubKeyBase64 = Buffer.from(account.pubkey).toString('base64');
      
      console.log(`Connected to address: ${account.address}`);
      console.log(`Public key (base64): ${pubKeyBase64}`);
      
      // Step 4: Prepare transaction via backend API
      console.log(`Preparing swap of ${amount} USDT for address ${fromAddress}`);
      const prepareResponse = await axios.post(
        `${API_BASE_URL}/prepare-swap`,
        {
          amount: amount,
          walletAddress: fromAddress,
          pubKey: pubKeyBase64
        }
      );
      
      const preparedData = prepareResponse.data;
      console.log("Received transaction data from backend:", preparedData);
      
      // Step 5: Sign with Keplr - Using SignAmino instead of SignDirect
      console.log("Requesting signature from Keplr...");
      
      // Convert base64 strings to documents for signing
      const signDoc = {
        chain_id: preparedData.txData.chainId,
        account_number: preparedData.txData.accountNumber,
        sequence: preparedData.txData.sequence,
        fee: preparedData.fee,
        msgs: preparedData.swapInfo ? [
          {
            type: "wasm/MsgExecuteContract",
            value: {
              sender: fromAddress,
              contract: preparedData.swapInfo.contractAddress,
              msg: {
                swap_min_output: {
                  target_denom: "inj",
                  min_output_quantity: "1"
                }
              },
              funds: [
                {
                  denom: preparedData.swapInfo.denom,
                  amount: String(preparedData.swapInfo.amount * 1000000) // Convert to micro units
                }
              ]
            }
          }
        ] : [
          // If not swap, then it's a send
          {
            type: "cosmos-sdk/MsgSend",
            value: {
              from_address: fromAddress,
              to_address: toAddress,
              amount: [
                {
                  denom: "inj",
                  amount: String(amount * 1000000000000000000) // Convert to wei (18 decimals)
                }
              ]
            }
          }
        ],
        memo: ""
      };
      
      // Sign with Keplr's signAmino
      const signResponse = await offlineSigner.signAmino(fromAddress, signDoc);
      
      console.log("Signature received:", signResponse);
      
      // Step 6: Broadcast via backend API
      const broadcastResponse = await axios.post(
        `${API_BASE_URL}/broadcast-tx`,
        {
          signedTxData: {
            txRaw: {
              bodyBytes: preparedData.txData.bodyBytes,
              authInfoBytes: preparedData.txData.authInfoBytes,
              signatures: [signResponse.signature.signature]
            }
          }
        }
      );
      
      const result = broadcastResponse.data;
      console.log("Broadcast response:", result);
      
      if (result.success && result.txHash) {
        return {
          success: true,
          txHash: result.txHash
        };
      } else {
        throw new Error(result.error || "Transaction broadcast failed");
      }
    } catch (error: any) {
      console.error("Transaction error:", error);
      return {
        success: false,
        error: error.message || "Failed to execute transaction"
      };
    }
  }

  /**
   * Check the status of a transaction
   */
  async checkTransactionStatus(txHash: string): Promise<TransactionStatus> {
    try {
      const response = await axios.get(
        `https://testnet.lcd.injective.network/cosmos/tx/v1beta1/txs/${txHash}`
      );
      
      const txData = response.data;
      
      // Extract relevant information
      return {
        success: txData.tx_response.code === 0,
        height: txData.tx_response.height,
        gasUsed: txData.tx_response.gas_used,
        timestamp: txData.tx_response.timestamp,
        error: txData.tx_response.raw_log.includes("error") ? txData.tx_response.raw_log : undefined
      };
    } catch (error: any) {
      console.error("Error checking transaction status:", error);
      
      // If we can't find the transaction, it might still be pending
      return {
        success: false,
        error: "Transaction not found or still pending"
      };
    }
  }

  /**
   * Get the transaction explorer URL
   */
  getTransactionExplorerUrl(txHash: string): string {
    return `https://testnet.explorer.injective.network/transaction/${txHash}`;
  }
}

// Export as singleton
export default new InjectiveService();

// Define Keplr interface
declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      getOfflineSigner: (chainId: string) => {
        getAccounts: () => Promise<KeplrAccount[]>;
        signAmino: (signerAddress: string, signDoc: any) => Promise<any>;
      };
      sendTx: (chainId: string, MsgBroadcaster: any[], options: SendTxOptions, broadcastMode: string) => Promise<{ txHash: string; }>;
    };
  }
}