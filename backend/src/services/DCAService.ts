import { DCAPlugin } from '../plugins/types';
import { InjectivePlugin } from '../plugins/injective';
import { TonPlugin } from '../plugins/ton';
import { InvestmentPlan, IInvestmentPlan } from '../models/InvestmentPlan';
import { User, IUser } from '../models/User';
import cron from 'node-cron';
import { logger } from '../utils/logger';
import { analyzeTokenPrice } from './PriceAnalysisService';

export class DCAService {
  private plugin: DCAPlugin;
  private cronJobs: Map<string, cron.ScheduledTask>;

  constructor() {
    this.plugin = process.env.BLOCKCHAIN_PLUGIN === 'ton' ? new TonPlugin() : new InjectivePlugin();
    this.cronJobs = new Map();
    this.initializeExistingPlans();
  }

  private async initializeExistingPlans() {
    try {
      const activePlans = await InvestmentPlan.find({ isActive: true });
      activePlans.forEach(plan => this.schedulePlan(plan));
    } catch (error) {
      logger.error('Failed to initialize existing plans:', error);
    }
  }

  private getCronExpression(frequency: string): string {
    switch (frequency) {
      case 'minute':
        return '* * * * *';
      case 'hour':
        return '0 * * * *';
      case 'day':
        return '0 0 * * *';
      default:
        throw new Error('Invalid frequency');
    }
  }

  private async executePlan(plan: IInvestmentPlan) {
    try {
      const user = await User.findById(plan.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate the execution amount based on price analysis (only after first execution)
      let executionAmount = plan.amount;

      // If this is not the first execution, apply the AI-based factor
      if (plan.executionCount > 0) {
        // Get price analysis for Injective token
        const analysis = await analyzeTokenPrice('injective-protocol');
        
        // Apply the price factor to the initial amount
        executionAmount = plan.initialAmount * analysis.priceFactor;
        
        logger.info(`Plan ${plan._id}: Applying price factor ${analysis.priceFactor}. 
          Initial amount: ${plan.initialAmount}, Adjusted amount: ${executionAmount}`);
      }

      // Execute the transaction with the calculated amount
      const txHash = await this.plugin.sendTransaction(
        executionAmount,
        user.address,
        plan.toAddress
      );

      // Update plan data
      plan.lastExecutionTime = new Date();
      plan.totalInvested += executionAmount;
      plan.executionCount += 1;
      
      // After first execution, update the amount with the new calculated amount
      if (plan.executionCount === 1) {
        plan.initialAmount = plan.amount; // Save the initial amount
      }
      
      await plan.save();

      logger.info(`Successfully executed DCA plan: ${plan._id}, txHash: ${txHash}, amount: ${executionAmount}`);
    } catch (error) {
      logger.error(`Failed to execute DCA plan: ${plan._id}`, error);
    }
  }

  private schedulePlan(plan: IInvestmentPlan) {
    const cronExpression = this.getCronExpression(plan.frequency);
    const job = cron.schedule(cronExpression, () => this.executePlan(plan));
    this.cronJobs.set(plan._id.toString(), job);
  }

  async createPlan(userId: string, planData: {
    amount: number;
    frequency: string;
    toAddress: string;
  }): Promise<IInvestmentPlan> {
    const plan = await InvestmentPlan.create({
      userId,
      ...planData,
      initialAmount: planData.amount, // Store the initial amount
      isActive: true,
      executionCount: 0
    });

    this.schedulePlan(plan);
    return plan;
  }

  async stopPlan(planId: string): Promise<IInvestmentPlan | null> {
    const plan = await InvestmentPlan.findById(planId);
    if (!plan) {
      return null;
    }

    plan.isActive = false;
    await plan.save();

    const job = this.cronJobs.get(planId);
    if (job) {
      job.stop();
      this.cronJobs.delete(planId);
    }

    return plan;
  }

  async getUserPlans(userId: string): Promise<IInvestmentPlan[]> {
    return InvestmentPlan.find({ userId });
  }

  async getUserTotalInvestment(userId: string): Promise<number> {
    const result = await InvestmentPlan.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: null, total: { $sum: '$totalInvested' } } }
    ]);
    return result.length > 0 ? result[0].total : 0;
  }
}