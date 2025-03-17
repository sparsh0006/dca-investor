export interface DCAPlugin {
  name: string;
  sendTransaction(amount: number, fromAddress: string, toAddress: string): Promise<string>;
  getUSDTBalance(address: string): Promise<number>;
  getNativeBalance(address: string): Promise<number>;
}

export type SupportedPlugins = 'injective' | 'ton'; 