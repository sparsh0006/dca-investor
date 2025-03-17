import { InjectivePlugin } from '../src/plugins/injective';
import dotenv from 'dotenv';
dotenv.config();

async function testInjectivePlugin() {
  try {
    console.log('Starting Injective Plugin test...');
    
    // Initialize the plugin
    const plugin = new InjectivePlugin();
    
    // 1. Test balance queries (non-destructive)
    const testAddress1= "inj1crppe59mlsptgdjfd6qkqkp6fuugu9zpym8qzt";// Replace with your address
    const testAddress2= "inj1cdymmkwla6v545l4jp4yu59elelqmd3ptx6lrs"
    console.log(`\nQuerying balances for ${testAddress1}...`);
    
    const nativeBalance = await plugin.getNativeBalance(testAddress1);
    console.log(`INJ Balance: ${nativeBalance}`);
    
    const usdtBalance = await plugin.getUSDTBalance(testAddress1);
    console.log(`USDT Balance: ${usdtBalance}`);
    
    
    console.log('\nTesting swap transaction with minimal amount...');
    const swapAmount = 100; // Swap USDT
    const txHash = await plugin.sendTransaction(
      swapAmount,
      testAddress1, // from address 
      testAddress2  // to address 
    );
    console.log(`Swap transaction complete! Hash: ${txHash}`);
    
    // 3. Verify balances changed after swap
    console.log('\nVerifying post-swap balances...');
    const newNativeBalance = await plugin.getNativeBalance(testAddress2);
    const newUsdtBalance = await plugin.getUSDTBalance(testAddress1);
    
    console.log(`New INJ Balance: ${newNativeBalance} (Change: ${newNativeBalance - nativeBalance})`);
    console.log(`New USDT Balance: ${newUsdtBalance} (Change: ${newUsdtBalance - usdtBalance})`);
    
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testInjectivePlugin().catch(console.error);