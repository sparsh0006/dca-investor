interface KeplrAccount {
  address: string;
  algo: string;
  pubkey: Uint8Array;
}

interface KeplrBalance {
  amount: string;
  denom: string;
}

interface KeplrKey {
  name: string;
  address: string;
  pubKey: Uint8Array;
  algo: string;
  isNanoLedger: boolean;
  bech32Address: string;
}

interface Fee {
  amount: Array<{
    amount: string;
    denom: string;
  }>;
  gas: string;
}

interface SendTxOptions {
  memo?: string;
  fee?: Fee;
  gasLimit?: string;
}

interface Window {
  keplr?: {
    enable: (chainId: string) => Promise<void>;
    getOfflineSigner: (chainId: string) => {
      getAccounts: () => Promise<KeplrAccount[]>;
      signAmino: (signerAddress: string, signDoc: any) => Promise<any>;
    };
    getOfflineSignerAuto: (chainId: string) => Promise<any>;
    getKey: (chainId: string) => Promise<KeplrKey>;
    getBalance: (chainId: string, address: string, denom: string) => Promise<KeplrBalance>;
    experimentalSuggestChain: (chainInfo: any) => Promise<void>;
    sendTx: (
      chainId: string,
      MsgBroadcaster: any[],
      options: SendTxOptions,
      broadcastMode: string
    ) => Promise<{
      txHash: string;
    }>;
  };
}