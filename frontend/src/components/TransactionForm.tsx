import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import DCAService from "@/services/DCAService";
import TransactionSender from "./TransactionSender";
import InjectiveService, { TransactionStatus } from "@/services/InjectiveService";

interface TransactionFormProps {
  walletAddress: string;
  userId: string;
  apiBaseUrl?: string;
  onSuccess?: () => void;
}

export default function TransactionForm({
  walletAddress,
  userId,
  apiBaseUrl = "http://localhost:8000/api",
  onSuccess
}: TransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("1");
  const [unit, setUnit] = useState("minute");
  const [toAddress, setToAddress] = useState("");
  const [success, setSuccess] = useState(false);
  const [showTestSender, setShowTestSender] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TransactionStatus | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const isFormValid = () => {
    return (
      amount !== "" && 
      parseFloat(amount) > 0 && 
      frequency !== "" && 
      parseInt(frequency) > 0 && 
      toAddress.trim() !== ""
    );
  };

  // Function to check transaction status
  const verifyTransaction = async () => {
    if (!txHash) return;
    
    setIsVerifying(true);
    try {
      const status = await InjectiveService.checkTransactionStatus(txHash);
      setTxStatus(status);
    } catch (error) {
      console.error("Error verifying transaction:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  // Check transaction status periodically if txHash exists
  useEffect(() => {
    if (!txHash) return;

    // Check immediately
    verifyTransaction();

    // Then check every 10 seconds
    const interval = setInterval(verifyTransaction, 10000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, [txHash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setTxHash(null);
    setTxStatus(null);

    try {
      if (!userId) {
        throw new Error("User ID not available. Please reconnect your wallet.");
      }
      if (!walletAddress) {
        throw new Error("Wallet address not available. Please reconnect your wallet.");
      }

      const apiData = {
        userId: userId,
        amount: parseFloat(amount),
        frequency: unit,
        toAddress: toAddress
      };

      console.log("Sending data to API:", apiData);

      // Create the plan
      const response = await DCAService.createPlan(apiData);
      if (!response.success) {
        throw new Error(response.error || "Failed to create investment plan");
      }

      console.log("Plan created successfully:", response.data);

      // Perform the transaction through Keplr wallet
      const txResult = await InjectiveService.sendTransaction(
        parseFloat(amount),
        walletAddress,
        toAddress
      );

      if (!txResult.success) {
        throw new Error(txResult.error || "Transaction failed");
      }

      setTxHash(txResult.txHash);
      setSuccess(true);

      if (onSuccess) {
        setTimeout(() => onSuccess(), 2000);
      }
    } catch (error) {
      console.error("Error:", error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Transaction</CardTitle>
        <CardDescription>
          Set up your recurring transaction details (executed via your Keplr wallet)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              Your DCA plan has been created successfully. Initial transaction hash: {txHash}
              
              <div className="mt-2">
                <a 
                  href={txHash ? InjectiveService.getTransactionExplorerUrl(txHash) : "#"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  View on Explorer
                </a>
              </div>
              
              {txStatus && (
                <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                  <h4 className="font-medium">Transaction Status:</h4>
                  <p>Status: {txStatus.success ? "Success" : "Pending or Failed"}</p>
                  {txStatus.height && <p>Block Height: {txStatus.height}</p>}
                  {txStatus.gasUsed && <p>Gas Used: {txStatus.gasUsed}</p>}
                  {txStatus.timestamp && <p>Timestamp: {txStatus.timestamp}</p>}
                  {txStatus.error && <p className="text-red-500">Error: {txStatus.error}</p>}
                </div>
              )}
              
              <div className="mt-2 space-x-2">
                <Button 
                  onClick={verifyTransaction} 
                  disabled={isVerifying}
                  variant="outline"
                  size="sm"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Transaction"
                  )}
                </Button>
                <Button 
                  onClick={() => setShowTestSender(true)}
                  size="sm"
                >
                  Test Another Transaction
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount per Transfer</Label>
                <Input
                  id="amount"
                  placeholder="0.0"
                  type="number"
                  step="0.000001"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="token">Token</Label>
                <Input
                  id="token"
                  placeholder="INJ"
                  value="INJ"
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Repeat Every</Label>
                <Input
                  id="frequency"
                  placeholder="1"
                  type="number"
                  min="1"
                  required
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select 
                  value={unit} 
                  onValueChange={setUnit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minute">Minute</SelectItem>
                    <SelectItem value="hour">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">To Address</Label>
              <Input
                id="address"
                placeholder="inj..."
                required
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Enter the recipient's Injective wallet address
              </p>
            </div>

            <Button 
              className="w-full" 
              type="submit" 
              disabled={isLoading || !userId || !isFormValid() || !walletAddress}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Plan and Sending...
                </>
              ) : (
                "Create DCA Plan and Send"
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        )}

        {showTestSender && (
          <div className="mt-6">
            <TransactionSender
              walletAddress={walletAddress}
              toAddress={toAddress}
              amount={parseFloat(amount)}
              onSuccess={() => {
                if (onSuccess) setTimeout(onSuccess, 2000);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}