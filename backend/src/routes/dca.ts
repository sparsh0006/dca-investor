import express from 'express';
import { DCAService } from '../services/DCAService';
import { logger } from '../utils/logger';

const router = express.Router();
const dcaService = new DCAService();

// Create a new DCA plan
router.post('/plans', async (req, res) => {
  try {
    const { userId, amount, frequency, toAddress } = req.body;
    
    if (!userId || !amount || !frequency || !toAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const plan = await dcaService.createPlan(userId, {
      amount,
      frequency,
      toAddress
    });

    res.json(plan);
  } catch (error) {
    logger.error('Failed to create DCA plan:', error);
    res.status(500).json({ error: 'Failed to create DCA plan' });
  }
});

// Stop a DCA plan
router.post('/plans/:planId/stop', async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await dcaService.stopPlan(planId);

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(plan);
  } catch (error) {
    logger.error('Failed to stop DCA plan:', error);
    res.status(500).json({ error: 'Failed to stop DCA plan' });
  }
});

// Get user's plans
router.get('/users/:userId/plans', async (req, res) => {
  try {
    const { userId } = req.params;
    const plans = await dcaService.getUserPlans(userId);
    res.json(plans);
  } catch (error) {
    logger.error('Failed to get user plans:', error);
    res.status(500).json({ error: 'Failed to get user plans' });
  }
});

// Get user's total investment
router.get('/users/:userId/total-investment', async (req, res) => {
  try {
    const { userId } = req.params;
    const total = await dcaService.getUserTotalInvestment(userId);
    res.json({ totalInvestment: total });
  } catch (error) {
    logger.error('Failed to get total investment:', error);
    res.status(500).json({ error: 'Failed to get total investment' });
  }
});

export default router; 