// TransactionSender.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import InjectiveService from "../services/InjectiveService";

interface TransactionSenderProps {
  walletAddress: string;
  toAddress: string;
  amount: number;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

const TransactionSender: React.FC<TransactionSenderProps> = ({
  walletAddress,
  toAddress,
  amount,
  onSuccess,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendTransaction = async () => {
    setIsLoading(true);
    setError(null);
    setTxHash(null);

    try {
      if (!walletAddress) {
        throw new Error("No wallet address provided. Please connect your wallet.");
      }
      if (!toAddress) {
        throw new Error("No destination address provided.");
      }
      if (!amount || amount <= 0) {
        throw new Error("Invalid amount provided.");
      }

      const result = await InjectiveService.sendTransaction(
        amount,
        walletAddress,
        toAddress
      );

      if (!result.success) {
        throw new Error(result.error || "Transaction failed");
      }

      setTxHash(result.txHash);
      if (onSuccess) onSuccess(result.txHash);

    } catch (err) {
      console.error("Transaction error:", err);
      const errorMessage = (err as Error).message || "Unknown error occurred";
      setError(errorMessage);
      if (onError) onError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send Transaction</CardTitle>
        <CardDescription>
          Swap {amount} USDT to INJ and send to {toAddress} via your Keplr wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <div className="text-sm font-medium">From Address:</div>
            <div className="font-mono text-xs truncate bg-muted p-2 rounded">
              {walletAddress}
            </div>
            
            <div className="text-sm font-medium">To Address:</div>
            <div className="font-mono text-xs truncate bg-muted p-2 rounded">
              {toAddress}
            </div>
            
            <div className="text-sm font-medium">Amount:</div>
            <div className="font-mono text-xs bg-muted p-2 rounded">
              {amount} INJ
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSendTransaction} 
            disabled={isLoading || !walletAddress}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Transaction...
              </>
            ) : (
              "Send Transaction"
            )}
          </Button>

          {txHash && (
            <Alert className="bg-green-50 border-green-200">
              <AlertTitle>Transaction Sent!</AlertTitle>
              <AlertDescription>
                <div className="text-sm">Transaction Hash:</div>
                <div className="font-mono text-xs truncate">
                  {txHash}
                </div>
                <div className="mt-2">
                  <a 
                    href={`https://testnet.explorer.injective.network/transaction/${txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    View on Explorer
                  </a>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertTitle>Transaction Failed</AlertTitle>
              <AlertDescription className="text-sm text-red-600">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionSender;