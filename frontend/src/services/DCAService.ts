// DCA Service for handling API interactions with the backend
export interface DCAplan {
  _id: string;
  userId: string;
  amount: number;
  frequency: string;
  toAddress: string;
  isActive: boolean;
  lastExecutionTime: string;
  totalInvested: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDCAplanParams {
  userId: string;
  amount: number;
  frequency: string; // "minute", "hour", "day"
  toAddress: string;
}

export interface DCAResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class DCAService {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8000/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Create a new DCA plan
   */
  async createPlan(params: CreateDCAplanParams): Promise<DCAResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/dca/plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Error: ${response.status}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to create DCA plan:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get all plans for a user
   */
  async getUserPlans(userId: string): Promise<DCAResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/dca/users/${userId}/plans`);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Error: ${response.status}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to get user plans:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Stop a DCA plan
   */
  async stopPlan(planId: string): Promise<DCAResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/dca/plans/${planId}/stop`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Error: ${response.status}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to stop DCA plan:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get user's total investment
   */
  async getTotalInvestment(userId: string): Promise<DCAResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/dca/users/${userId}/total-investment`);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Error: ${response.status}`
        };
      }

      return {
        success: true,
        data: data.totalInvestment
      };
    } catch (error) {
      console.error('Failed to get total investment:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
  
  // Execute a one-time transaction right now (for manual execution)
  async executeManualTransaction(planId: string): Promise<DCAResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/dca/plans/${planId}/execute`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Error: ${response.status}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Failed to execute transaction:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

export default new DCAService();