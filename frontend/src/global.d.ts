// src/global.d.ts
export {};

declare global {
  interface Window {
    keplr?: {
      enable(chainId: string): Promise<void>;
      getOfflineSigner(chainId: string): any; // You can refine this type further if needed
      getBalance(chainId: string, address: string, denom: string): Promise<{ amount: string; denom: string }>;
      signAndBroadcast(chainId: string, msgs: any[], fee: any, memo?: string): Promise<{ txHash: string }>;
    };
  }
}