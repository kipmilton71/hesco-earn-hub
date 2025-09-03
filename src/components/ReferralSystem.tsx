import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  getUserReferrals, 
  getReferralRewards, 
  getCurrentUserPlanAmount 
} from '@/lib/api';
import { 
  Users, 
  Gift, 
  TrendingUp, 
  Copy, 
  CheckCircle,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  level: number;
  status: string;
  created_at: string;
  referred?: {
    id: string;
    email: string;
    created_at: string;
  };
}

interface ReferralReward {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_level: number;
  referred_plan_amount: number;
  reward_amount: number;
  status: string;
  created_at: string;
  referred?: {
    id: string;
    email: string;
    created_at: string;
  };
}

export default function ReferralSystem() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralRewards, setReferralRewards] = useState<ReferralReward[]>([]);
  const [planAmount, setPlanAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      loadReferralData();
    }
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const [referralData, rewards, plan] = await Promise.all([
        getUserReferrals(user.id),
        getReferralRewards(user.id),
        getCurrentUserPlanAmount(user.id)
      ]);

      setReferrals(referralData);
      setReferralRewards(rewards);
      setPlanAmount(plan);
    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const getReferralLink = (): string => {
    return `${window.location.origin}/register?ref=${user?.id}`;
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setCopied(true);
      toast.success('Referral link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy referral link');
    }
  };

  const shareReferralLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Hesco Earn Hub',
          text: 'Earn money daily with Hesco Earn Hub! Use my referral link to get started.',
          url: getReferralLink()
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      copyReferralLink();
    }
  };

  const getReferralReward = (level: number): number => {
    switch (planAmount) {
      case 500:
        return level === 1 ? 25 : level === 2 ? 15 : 5;
      case 1000:
        return level === 1 ? 50 : level === 2 ? 30 : 15;
      case 2000:
        return level === 1 ? 100 : level === 2 ? 75 : 50;
      case 5000:
        return level === 1 ? 200 : level === 2 ? 150 : 100;
      default:
        return 0;
    }
  };

  const getTotalReferralEarnings = (): number => {
    return referralRewards.reduce((total, reward) => total + reward.reward_amount, 0);
  };

  const getReferralsByLevel = (level: number): Referral[] => {
    return referrals.filter(ref => ref.level === level);
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toFixed(2)} KSh`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{referrals.length}</div>
            <p className="text-xs text-muted-foreground">
              Across all levels
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(getTotalReferralEarnings())}
            </div>
            <p className="text-xs text-muted-foreground">
              From referral rewards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Plan {planAmount}
            </div>
            <p className="text-xs text-muted-foreground">
              Active subscription
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Your Referral Link</span>
          </CardTitle>
          <CardDescription>
            Share this link with friends and earn rewards when they join and subscribe!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={getReferralLink()}
              readOnly
              className="flex-1 px-3 py-2 border rounded-md text-sm bg-gray-50"
            />
            <Button
              onClick={copyReferralLink}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy</span>
                </>
              )}
            </Button>
            <Button
              onClick={shareReferralLink}
              size="sm"
              className="flex items-center space-x-1"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Rewards Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Rewards Structure</CardTitle>
          <CardDescription>
            Earn rewards based on your current plan when people you refer join and subscribe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">1st Level</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(getReferralReward(1))}
                </div>
                <p className="text-sm text-gray-600">Direct referrals</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">2nd Level</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(getReferralReward(2))}
                </div>
                <p className="text-sm text-gray-600">Referrals of referrals</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">3rd Level</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(getReferralReward(3))}
                </div>
                <p className="text-sm text-gray-600">3rd generation</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referral Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((level) => {
          const levelReferrals = getReferralsByLevel(level);
          const levelRewards = referralRewards.filter(r => r.referral_level === level);
          const totalEarnings = levelRewards.reduce((sum, r) => sum + r.reward_amount, 0);
          
          return (
            <Card key={level}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Level {level}</span>
                  <Badge variant="outline">{levelReferrals.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Referrals:</span>
                    <span className="font-medium">{levelReferrals.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Reward per referral:</span>
                    <span className="font-medium">{formatCurrency(getReferralReward(level))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Total earnings:</span>
                    <span className="font-medium text-green-600">{formatCurrency(totalEarnings)}</span>
                  </div>
                </div>
                
                {levelReferrals.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Recent Referrals:</p>
                      {levelReferrals.slice(0, 3).map((referral) => (
                        <div key={referral.id} className="flex justify-between text-xs">
                          <span className="truncate">{referral.referred?.email || 'Unknown'}</span>
                          <span className="text-gray-500">{formatDate(referral.created_at)}</span>
                        </div>
                      ))}
                      {levelReferrals.length > 3 && (
                        <p className="text-xs text-gray-500">
                          +{levelReferrals.length - 3} more
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Referral Rewards */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Referral Rewards</CardTitle>
          <CardDescription>
            Your latest earnings from referrals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referralRewards.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No referral rewards yet</p>
          ) : (
            <div className="space-y-3">
              {referralRewards.slice(0, 10).map((reward) => (
                <div key={reward.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Level {reward.referral_level} Referral</p>
                    <p className="text-sm text-gray-600">
                      {reward.referred?.email} • {formatDate(reward.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">{formatCurrency(reward.reward_amount)}</p>
                    <p className="text-xs text-gray-500">Plan: {formatCurrency(reward.referred_plan_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
