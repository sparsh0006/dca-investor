import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, StopCircle, Clock } from "lucide-react";
import DCAService, { DCAplan } from "@/services/DCAService";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface UserPlansProps {
  userId: string;
  onBack: () => void;
}

const UserPlans: React.FC<UserPlansProps> = ({ userId, onBack }) => {
  const [plans, setPlans] = useState<DCAplan[]>([]);
  const [totalInvestment, setTotalInvestment] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionPlanId, setActionPlanId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch user's plans and total investment
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get user plans
        const plansResponse = await DCAService.getUserPlans(userId);
        if (plansResponse.success && plansResponse.data) {
          setPlans(plansResponse.data);
        } else {
          setError(plansResponse.error || "Failed to fetch plans");
        }
        
        // Get total investment
        const investmentResponse = await DCAService.getTotalInvestment(userId);
        if (investmentResponse.success && investmentResponse.data !== undefined) {
          setTotalInvestment(investmentResponse.data);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchData();
    }
  }, [userId]);

  // Handle stopping a plan
  const handleStopPlan = async (planId: string) => {
    setActionPlanId(planId);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await DCAService.stopPlan(planId);
      
      if (response.success) {
        setSuccessMessage("Plan successfully stopped");
        // Update local state to reflect the change
        setPlans(plans.map(plan => 
          plan._id === planId 
            ? { ...plan, isActive: false } 
            : plan
        ));
      } else {
        setError(response.error || "Failed to stop plan");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionPlanId(null);
    }
  };

  // Handle manual execution of a plan
  const handleExecutePlan = async (planId: string) => {
    setActionPlanId(planId);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await DCAService.executeManualTransaction(planId);
      
      if (response.success) {
        setSuccessMessage("Transaction successfully executed");
        // Refresh plans to show updated lastExecutionTime
        const plansResponse = await DCAService.getUserPlans(userId);
        if (plansResponse.success && plansResponse.data) {
          setPlans(plansResponse.data);
        }
      } else {
        setError(response.error || "Failed to execute transaction");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionPlanId(null);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your DCA Plans</CardTitle>
        <CardDescription>
          View and manage your active Dollar Cost Averaging plans
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : plans.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No plans found. Create your first plan to get started.</p>
          </div>
        ) : (
          <>
            {successMessage && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            
            <div className="mb-4 p-4 bg-muted rounded-md">
              <p className="text-sm font-medium">Total Invested: <span className="font-bold">{totalInvestment} INJ</span></p>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan._id}>
                    <TableCell>{plan.amount} INJ</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="capitalize">{plan.frequency}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[120px]">
                      {plan.toAddress}
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? "default" : "secondary"}>
                        {plan.isActive ? "Active" : "Stopped"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(plan.lastExecutionTime)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {plan.isActive && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleExecutePlan(plan._id)}
                              disabled={actionPlanId === plan._id}
                            >
                              {actionPlanId === plan._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleStopPlan(plan._id)}
                              disabled={actionPlanId === plan._id}
                            >
                              {actionPlanId === plan._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <StopCircle className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <div className="text-xs text-muted-foreground">
          Last updated: {new Date().toLocaleString()}
        </div>
      </CardFooter>
    </Card>
  );
};

export default UserPlans;