import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Buffer } from "buffer";

// Define Keplr interfaces
interface KeplrAccount {
  address: string;
  algo: string;
  pubkey: Uint8Array;
}

declare global {
  interface Window {
    keplr?: {
      enable: (chainId: string) => Promise<void>;
      getOfflineSigner: (chainId: string) => {
        getAccounts: () => Promise<KeplrAccount[]>;
        signAmino: (signerAddress: string, signDoc: any) => Promise<any>;
      };
    };
  }
}

interface KeplrWalletProps {
  onConnect?: (address: string, userId: string, pubKey: string) => void;
  apiBaseUrl?: string;
}

const KeplrWallet: React.FC<KeplrWalletProps> = ({ 
  onConnect,
  apiBaseUrl = "http://localhost:8000/api"
}) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [pubKey, setPubKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const chainId = "injective-888"; // Injective Testnet chain ID
  
  // Check if wallet was previously connected
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    const savedUserId = localStorage.getItem('userId');
    
    if (savedAddress && savedUserId) {
      setWalletAddress(savedAddress);
      
      // Try to reconnect with Keplr if it's available
      if (window.keplr) {
        reconnectKeplr(savedAddress, savedUserId);
      }
    }
  }, []);
  
  // Reconnect to Keplr without user interaction
  const reconnectKeplr = async (savedAddress: string, savedUserId: string) => {
    try {
      await window.keplr?.enable(chainId);
      const offlineSigner = window.keplr?.getOfflineSigner(chainId);
      
      if (!offlineSigner) return;
      
      const accounts = await offlineSigner.getAccounts();
      const currentAddress = accounts[0]?.address;
      
      // Make sure the saved address matches the current Keplr address
      if (currentAddress && currentAddress === savedAddress) {
        // Get and save the public key
        const pubKeyBase64 = Buffer.from(accounts[0].pubkey).toString('base64');
        setPubKey(pubKeyBase64);
        localStorage.setItem('walletPubKey', pubKeyBase64);
        
        // Notify parent component
        onConnect?.(savedAddress, savedUserId, pubKeyBase64);
      }
    } catch (e) {
      console.error("Error reconnecting to Keplr:", e);
      // Don't show error to user on auto-reconnect attempt
    }
  };

  // Find or create user by address
  const findOrCreateUser = async (address: string): Promise<any> => {
    try {
      setStatus("Checking if user exists...");
      
      // First try to find the user
      const findResponse = await fetch(`${apiBaseUrl}/users/${address}`);
      
      if (findResponse.ok) {
        const userData = await findResponse.json();
        console.log('User found:', userData);
        return userData;
      }
      
      // If user not found, create a new one
      setStatus("Creating new user...");
      const createResponse = await fetch(`${apiBaseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create user');
      }
      
      const userData = await createResponse.json();
      console.log('User created successfully:', userData);
      
      return userData;
    } catch (error: any) {
      console.error('Error finding/creating user:', error);
      throw error;
    }
  };

  const connectKeplrWallet = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setStatus("Connecting to Keplr wallet...");
      
      if (!window.keplr) {
        setError("Keplr extension not found. Please install Keplr.");
        return;
      }

      await window.keplr.enable(chainId);
      const offlineSigner = window.keplr.getOfflineSigner(chainId);
      const accounts = await offlineSigner.getAccounts();

      if (accounts.length > 0) {
        const address = accounts[0].address;
        setWalletAddress(address);
        
        // Get and save the public key
        const pubKeyBase64 = Buffer.from(accounts[0].pubkey).toString('base64');
        setPubKey(pubKeyBase64);
        localStorage.setItem('walletPubKey', pubKeyBase64);
        
        // Find or create user in database
        const userData = await findOrCreateUser(address);
        
        if (userData && userData._id) {
          // Save user data to localStorage for persistence
          localStorage.setItem('walletAddress', address);
          localStorage.setItem('userId', userData._id);
          
          // Notify parent component
          onConnect?.(address, userData._id, pubKeyBase64);
        } else {
          throw new Error("User data missing MongoDB ID");
        }
      } else {
        setError("Failed to retrieve accounts from Keplr.");
      }
    } catch (e: any) {
      setError("An error occurred: " + e.message);
      setWalletAddress(null);
    } finally {
      setIsLoading(false);
      setStatus(null);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        {walletAddress ? (
          <div className="text-center">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Connected:</p>
            <p className="font-mono text-xs truncate bg-muted p-2 rounded mb-4">
              {walletAddress}
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                localStorage.removeItem('walletAddress');
                localStorage.removeItem('userId');
                localStorage.removeItem('walletPubKey');
                setWalletAddress(null);
                setPubKey(null);
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={connectKeplrWallet}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status || "Connecting..."}
              </>
            ) : (
              "Connect Wallet"
            )}
          </Button>
        )}

        {error && (
          <p className="mt-4 text-sm text-destructive text-center">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default KeplrWallet;