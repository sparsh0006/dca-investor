import mongoose, { Schema, Document } from 'mongoose';

export interface IInvestmentPlan extends Document {
  _id: mongoose.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  amount: number;
  frequency: string; // 'minute', 'hour', 'day'
  toAddress: string;
  isActive: boolean;
  lastExecutionTime: Date;
  totalInvested: number;
  createdAt: Date;
  updatedAt: Date;
  executionCount: number; // Add this field to track number of executions
  initialAmount: number; // Original amount set by user
}

const InvestmentPlanSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  initialAmount: { type: Number, required: true },  // Store the original amount
  frequency: { 
    type: String, 
    required: true,
    enum: ['minute', 'hour', 'day']
  },
  toAddress: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastExecutionTime: { type: Date, default: null },
  totalInvested: { type: Number, default: 0 },
  executionCount: { type: Number, default: 0 }  // Track number of executions
}, {
  timestamps: true
});

export const InvestmentPlan = mongoose.model<IInvestmentPlan>('InvestmentPlan', InvestmentPlanSchema);