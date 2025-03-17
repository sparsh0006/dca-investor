import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import { fromBase64, TxRestApi, TxRaw } from "@injectivelabs/sdk-ts";
import cors from "cors";
import { Buffer } from 'buffer';

interface SignedTx {
  signedTx: any;
  signature: { 
    signature: string;
    pub_key?: { type: string; value: string };
  };
}

const app = express();
app.use(bodyParser.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.post("/api/sendTransaction", async (req: Request, res: Response) => {
  try {
    console.log("Request received");
    
    const { signedTx, signature }: SignedTx = req.body;
    if (!signedTx || !signature) {
      throw new Error("Invalid request: signedTx or signature is missing");
    }

    console.log("Received signed transaction:", JSON.stringify(signedTx, null, 2));
    console.log("Received signature:", signature.signature);

    // Convert the base64 signature to Uint8Array
    const signatureBytes = fromBase64(signature.signature);
    
    // Creating TxRaw format expected by the Injective SDK
    // The format needs bodyBytes and authInfoBytes as Uint8Array
    
    // Prepare bodyBytes
    const bodyBytes = new Uint8Array(
      Buffer.from(JSON.stringify({
        messages: signedTx.msgs,
        memo: signedTx.memo
      }))
    );
    
    // Prepare authInfoBytes
    const authInfoBytes = new Uint8Array(
      Buffer.from(JSON.stringify({
        fee: signedTx.fee,
        signer_infos: [{
          public_key: signature.pub_key,
          sequence: signedTx.sequence
        }]
      }))
    );
    
    // Creating a valid TxRaw object
    const txRaw = {
      bodyBytes: bodyBytes,
      authInfoBytes: authInfoBytes,
      signatures: [signatureBytes]
    } as TxRaw;

    console.log("Broadcasting TxRaw transaction");
    
    const rpcEndpoint = "https://k8s.testnet.tm.injective.network";
    const txClient = new TxRestApi(rpcEndpoint);
    
    // Use the basic broadcast method
    const txResponse = await txClient.broadcast(txRaw);
    console.log("Transaction broadcast response:", txResponse);

    res.json({ txResponse });
  } catch (error: any) {
    console.error("Error broadcasting transaction:", error);
    res.status(500).json({ 
      error: "Transaction broadcast failed", 
      details: error.message,
      stack: error.stack
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});