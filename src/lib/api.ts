import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/lib/database.types';

type UserBalance = Database['public']['Tables']['user_balances']['Row'];
type Referral = Database['public']['Tables']['referrals']['Row'];
type ReferralReward = Database['public']['Tables']['referral_rewards']['Row'];
type TaskCompletion = Database['public']['Tables']['task_completions']['Row'];
type WithdrawalRequest = Database['public']['Tables']['withdrawal_requests']['Row'];
type BalanceTransaction = Database['public']['Tables']['balance_transactions']['Row'];
type VideoLink = Database['public']['Tables']['video_links']['Row'];
type DailyTask = Database['public']['Tables']['daily_tasks']['Row'];
type Question = Database['public']['Tables']['questions']['Row'];
type UserResponse = Database['public']['Tables']['user_responses']['Row'];

// User Balance API
export const getUserBalance = async (userId: string): Promise<UserBalance | null> => {
  const { data, error } = await supabase
    .from('user_balances')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user balance:', error);
    return null;
  }

  return data;
};

// Referral API
export const createReferral = async (referrerId: string, referredId: string): Promise<Referral | null> => {
  const { data, error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrerId,
      referred_id: referredId,
      level: 1,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating referral:', error);
    return null;
  }

  return data;
};

export const getUserReferrals = async (userId: string): Promise<Referral[]> => {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user referrals:', error);
    return [];
  }

  if (!data || data.length === 0) return [];
  const referredIds = Array.from(new Set(data.map(r => r.referred_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .in('id', referredIds);
  if (profilesError || !profiles) return data as any;
  const idToProfile = new Map(profiles.map(p => [p.id, p]));
  return (data as any[]).map(r => ({
    ...r,
    referred: idToProfile.get(r.referred_id) || undefined,
  }));
};

export const getReferralRewards = async (userId: string): Promise<ReferralReward[]> => {
  const { data, error } = await supabase
    .from('referral_rewards')
    .select('*')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching referral rewards:', error);
    return [];
  }

  if (!data || data.length === 0) return [];
  const referredIds = Array.from(new Set(data.map(r => r.referred_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .in('id', referredIds);
  if (profilesError || !profiles) return data as any;
  const idToProfile = new Map(profiles.map(p => [p.id, p]));
  return (data as any[]).map(r => ({
    ...r,
    referred: idToProfile.get(r.referred_id) || undefined,
  }));
};

// Video Links API
export const getActiveVideoLinks = async (): Promise<VideoLink[]> => {
  const { data, error } = await supabase
    .from('video_links')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching video links:', error);
    return [];
  }

  return data || [];
};

export const getVideoLinkById = async (videoLinkId: string): Promise<VideoLink | null> => {
  const { data, error } = await supabase
    .from('video_links')
    .select('*')
    .eq('id', videoLinkId)
    .single();

  if (error) {
    console.error('Error fetching video link:', error);
    return null;
  }

  return data;
};

// Daily Tasks API
export const getActiveDailyTasks = async (): Promise<DailyTask[]> => {
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching daily tasks:', error);
    return [];
  }

  return data || [];
};

export const getDailyTaskById = async (taskId: string): Promise<DailyTask | null> => {
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error) {
    console.error('Error fetching daily task:', error);
    return null;
  }

  return data;
};

export const getQuestionsForTask = async (taskId: string): Promise<Question[]> => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('daily_task_id', taskId)
    .eq('is_active', true)
    .order('order_index');

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return data || [];
};

export const submitSurveyResponses = async (
  userId: string,
  taskId: string,
  responses: Array<{ questionId: string; responseText?: string; responseOptions?: string[] }>
): Promise<boolean> => {
  const responseData = responses.map(response => ({
    user_id: userId,
    question_id: response.questionId,
    daily_task_id: taskId,
    response_text: response.responseText,
    response_options: response.responseOptions
  }));

  const { error } = await supabase
    .from('user_responses')
    .insert(responseData);

  if (error) {
    console.error('Error submitting survey responses:', error);
    return false;
  }

  return true;
};

// Task Completion API
export const completeVideoTask = async (userId: string, videoLinkId: string): Promise<number | null> => {
  try {
    // Check if video task already completed today for this specific video
    const today = new Date().toISOString().split('T')[0];
    const { data: existingCompletion } = await supabase
      .from('video_task_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('video_link_id', videoLinkId)
      .eq('task_date', today)
      .maybeSingle();

    if (existingCompletion) {
      throw new Error('This video task already completed today');
    }

    // Get user's plan amount to calculate reward
    const planAmount = await getCurrentUserPlanAmount(userId);
    
    if (!planAmount) {
      throw new Error('No active subscription plan found');
    }

    // Calculate reward based on plan
    let rewardAmount = 0;
    switch (planAmount) {
      case 500: rewardAmount = 15; break;
      case 1000: rewardAmount = 30; break;
      case 2000: rewardAmount = 50; break;
      case 5000: rewardAmount = 70; break;
      default: throw new Error('Invalid plan amount');
    }

    // Create video task completion record
    const { data: videoCompletion, error: videoError } = await supabase
      .from('video_task_completions')
      .insert({
        user_id: userId,
        video_link_id: videoLinkId,
        reward_amount: rewardAmount,
        task_date: today
      })
      .select()
      .single();

    if (videoError) throw videoError;

    // Use secure function to complete task and update balance
    const { data, error } = await supabase.rpc('complete_task_and_update_balance', {
      p_user_id: userId,
      p_task_type: 'video',
      p_task_date: today,
      p_reward_amount: rewardAmount
    });

    if (error) throw error;

    return rewardAmount;
  } catch (error) {
    console.error('Error completing video task:', error);
    return null;
  }
};

export const completeSurveyTask = async (userId: string, dailyTaskId: string): Promise<number | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get user's plan amount to calculate reward
    const planAmount = await getCurrentUserPlanAmount(userId);
    
    if (!planAmount) {
      throw new Error('No active subscription plan found');
    }

    // Calculate reward based on plan
    let rewardAmount = 0;
    switch (planAmount) {
      case 500: rewardAmount = 10; break;
      case 1000: rewardAmount = 20; break;
      case 2000: rewardAmount = 40; break;
      case 5000: rewardAmount = 60; break;
      default: throw new Error('Invalid plan amount');
    }

    // Use secure function to complete task and update balance
    const { data, error } = await supabase.rpc('complete_task_and_update_balance', {
      p_user_id: userId,
      p_task_type: 'survey',
      p_task_date: today,
      p_reward_amount: rewardAmount
    });

    if (error) throw error;

    return rewardAmount;
  } catch (error) {
    console.error('Error completing survey task:', error);
    return null;
  }
};

export const getTaskCompletions = async (userId: string): Promise<TaskCompletion[]> => {
  const { data, error } = await supabase
    .from('task_completions')
    .select(`
      *,
      video_link:video_links(id, title, description),
      daily_task:daily_tasks(id, title, description)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching task completions:', error);
    return [];
  }

  return data || [];
};

export const getTodayTaskCompletions = async (userId: string): Promise<TaskCompletion[]> => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .eq('user_id', userId)
    .eq('task_date', today);

  if (error) {
    console.error('Error fetching today\'s task completions:', error);
    return [];
  }

  if (!data || data.length === 0) return [];
  const videoIds = Array.from(new Set(data.map(d => d.video_link_id).filter(Boolean)));
  const taskIds = Array.from(new Set(data.map(d => d.daily_task_id).filter(Boolean)));
  const [videosRes, tasksRes] = await Promise.all([
    videoIds.length
      ? supabase.from('video_links').select('id, title, description').in('id', videoIds)
      : Promise.resolve({ data: [], error: null } as any),
    taskIds.length
      ? supabase.from('daily_tasks').select('id, title, description').in('id', taskIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);
  const videos = (videosRes.data || []) as any[];
  const tasks = (tasksRes.data || []) as any[];
  const videoMap = new Map(videos.map(v => [v.id, v]));
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  return (data as any[]).map(d => ({
    ...d,
    video_link: d.video_link_id ? videoMap.get(d.video_link_id) : undefined,
    daily_task: d.daily_task_id ? taskMap.get(d.daily_task_id) : undefined,
  }));
};

// Withdrawal API
export const createWithdrawalRequest = async (
  userId: string,
  amount: number,
  mpesaNumber: string
): Promise<string | null> => {
  const { data, error } = await supabase.rpc('process_withdrawal_request', {
    user_uuid: userId,
    amount_param: amount,
    mpesa_number_param: mpesaNumber
  });

  if (error) {
    console.error('Error creating withdrawal request:', error);
    return null;
  }

  return data;
};

export const getWithdrawalRequests = async (userId: string): Promise<WithdrawalRequest[]> => {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching withdrawal requests:', error);
    return [];
  }

  return data || [];
};

// Admin API
export const getAllWithdrawalRequests = async (): Promise<WithdrawalRequest[]> => {
  const { data, error } = await supabase
    .from('withdrawal_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all withdrawal requests:', error);
    return [];
  }

  if (!data || data.length === 0) return [];
  const userIds = Array.from(new Set(data.map(w => w.user_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, phone')
    .in('id', userIds);
  const profileMap = profiles && !profilesError ? new Map(profiles.map(p => [p.id, p])) : new Map();
  return (data as any[]).map(w => ({ ...w, user: profileMap.get(w.user_id) }));
};

export const updateWithdrawalStatus = async (
  withdrawalId: string,
  status: 'processing' | 'completed' | 'rejected',
  processedBy: string,
  notes?: string
): Promise<boolean> => {
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({
      status,
      processed_by: processedBy,
      processed_at: new Date().toISOString(),
      notes
    })
    .eq('id', withdrawalId);

  if (error) {
    console.error('Error updating withdrawal status:', error);
    return false;
  }

  return true;
};

export const getAllUserBalances = async (): Promise<UserBalance[]> => {
  const { data, error } = await supabase
    .from('user_balances')
    .select('*')
    .order('total_earned', { ascending: false });

  if (error) {
    console.error('Error fetching all user balances:', error);
    return [];
  }

  if (!data || data.length === 0) return [];
  const userIds = Array.from(new Set(data.map(b => b.user_id)));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, phone')
    .in('id', userIds);
  const profileMap = profiles && !profilesError ? new Map(profiles.map(p => [p.id, p])) : new Map();
  return (data as any[]).map(b => ({ ...b, user: profileMap.get(b.user_id) }));
};

export const getAllReferrals = async (): Promise<Referral[]> => {
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all referrals:', error);
    return [];
  }

  if (!data || data.length === 0) return [];
  const referrerIds = Array.from(new Set(data.map(r => r.referrer_id)));
  const referredIds = Array.from(new Set(data.map(r => r.referred_id)));
  const ids = Array.from(new Set([...referrerIds, ...referredIds]));
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, created_at')
    .in('id', ids);
  const profileMap = profiles && !profilesError ? new Map(profiles.map(p => [p.id, p])) : new Map();
  return (data as any[]).map(r => ({
    ...r,
    referrer: profileMap.get(r.referrer_id),
    referred: profileMap.get(r.referred_id),
  }));
};

export const getAllTaskCompletions = async (): Promise<TaskCompletion[]> => {
  const { data, error } = await supabase
    .from('task_completions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all task completions:', error);
    return [];
  }

  if (!data || data.length === 0) return [];
  const userIds = Array.from(new Set(data.map(t => t.user_id)));
  const videoIds = Array.from(new Set(data.map(t => t.video_link_id).filter(Boolean)));
  const taskIds = Array.from(new Set(data.map(t => t.daily_task_id).filter(Boolean)));
  const [profilesRes, videosRes, tasksRes] = await Promise.all([
    supabase.from('profiles').select('id, email').in('id', userIds),
    videoIds.length ? supabase.from('video_links').select('id, title, description').in('id', videoIds as string[]) : Promise.resolve({ data: [], error: null } as any),
    taskIds.length ? supabase.from('daily_tasks').select('id, title, description').in('id', taskIds as string[]) : Promise.resolve({ data: [], error: null } as any),
  ]);
  const profileMap = profilesRes.data ? new Map((profilesRes.data as any[]).map(p => [p.id, p])) : new Map();
  const videoMap = videosRes.data ? new Map((videosRes.data as any[]).map(v => [v.id, v])) : new Map();
  const taskMap = tasksRes.data ? new Map((tasksRes.data as any[]).map(t => [t.id, t])) : new Map();
  return (data as any[]).map(t => ({
    ...t,
    user: profileMap.get(t.user_id),
    video_link: t.video_link_id ? videoMap.get(t.video_link_id) : undefined,
    daily_task: t.daily_task_id ? taskMap.get(t.daily_task_id) : undefined,
  }));
};

// Video Links Management API (Admin)
export const getAllVideoLinks = async (): Promise<VideoLink[]> => {
  const { data, error } = await supabase
    .from('video_links')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all video links:', error);
    return [];
  }

  return data || [];
};

export const createVideoLink = async (
  title: string,
  description: string,
  videoUrl: string,
  durationMinutes: number,
  createdBy: string
): Promise<VideoLink | null> => {
  const { data, error } = await supabase
    .from('video_links')
    .insert({
      title,
      description,
      video_url: videoUrl,
      duration_minutes: durationMinutes,
      created_by: createdBy
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating video link:', error);
    return null;
  }

  return data;
};

export const updateVideoLink = async (
  id: string,
  updates: Partial<VideoLink>
): Promise<boolean> => {
  const { error } = await supabase
    .from('video_links')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating video link:', error);
    return false;
  }

  return true;
};

export const deleteVideoLink = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('video_links')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting video link:', error);
    return false;
  }

  return true;
};

// Daily Tasks Management API (Admin)
export const getAllDailyTasks = async (): Promise<DailyTask[]> => {
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all daily tasks:', error);
    return [];
  }

  return data || [];
};

export const createDailyTask = async (
  title: string,
  description: string,
  createdBy: string
): Promise<DailyTask | null> => {
  const { data, error } = await supabase
    .from('daily_tasks')
    .insert({
      title,
      description,
      created_by: createdBy
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating daily task:', error);
    return null;
  }

  return data;
};

export const updateDailyTask = async (
  id: string,
  updates: Partial<DailyTask>
): Promise<boolean> => {
  const { error } = await supabase
    .from('daily_tasks')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating daily task:', error);
    return false;
  }

  return true;
};

export const deleteDailyTask = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('daily_tasks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting daily task:', error);
    return false;
  }

  return true;
};

// Questions Management API (Admin)
export const getQuestionsForTaskAdmin = async (taskId: string): Promise<Question[]> => {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('daily_task_id', taskId)
    .order('order_index');

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return data || [];
};

export const createQuestion = async (
  questionText: string,
  questionType: string,
  options: string[] | null,
  isRequired: boolean,
  orderIndex: number,
  dailyTaskId: string
): Promise<Question | null> => {
  const { data, error } = await supabase
    .from('questions')
    .insert({
      question_text: questionText,
      question_type: questionType,
      options,
      is_required: isRequired,
      order_index: orderIndex,
      daily_task_id: dailyTaskId
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating question:', error);
    return null;
  }

  return data;
};

export const updateQuestion = async (
  id: string,
  updates: Partial<Question>
): Promise<boolean> => {
  const { error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating question:', error);
    return false;
  }

  return true;
};

export const deleteQuestion = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting question:', error);
    return false;
  }

  return true;
};

// User Responses API (Admin)
export const getUserResponsesForTask = async (taskId: string): Promise<UserResponse[]> => {
  const { data, error } = await supabase
    .from('user_responses')
    .select(`
      *,
      user:profiles!user_responses_user_id_fkey(id, email),
      question:questions!user_responses_question_id_fkey(id, question_text, question_type, order_index)
    `)
    .eq('daily_task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user responses:', error);
    return [];
  }

  return data || [];
};

// Transaction History API
export const getTransactionHistory = async (userId: string): Promise<BalanceTransaction[]> => {
  const { data, error } = await supabase
    .from('balance_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }

  return data || [];
};

// Utility Functions
export const getCurrentUserPlanAmount = async (userId: string): Promise<number> => {
  const { data, error } = await supabase.rpc('get_user_plan_amount', {
    user_uuid: userId
  });

  if (error) {
    console.error('Error getting user plan amount:', error);
    return 0;
  }

  return data || 0;
};

export const isWithdrawalDay = (): boolean => {
  const today = new Date();
  return today.getDay() === 6; // Saturday
};

export const calculateMaxWithdrawal = (planAmount: number, availableBalance: number): number => {
  const baseWithdrawal = (() => {
    switch (planAmount) {
      case 500: return 125;
      case 1000: return 250;
      case 2000: return 325;
      case 5000: return 500;
      default: return 0;
    }
  })();

  return baseWithdrawal + availableBalance;
};

export const calculateTax = (amount: number): number => {
  return amount * 0.15;
};

export const calculateNetAmount = (amount: number): number => {
  return amount - calculateTax(amount);
};

// System Settings API functions
export const getSystemSetting = async (key: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching system setting ${key}:`, error);
      return null;
    }

    return data?.setting_value || null;
  } catch (error) {
    console.error(`Error fetching system setting ${key}:`, error);
    return null;
  }
};

export const getMpesaPhoneNumber = async (): Promise<string> => {
  const phoneNumber = await getSystemSetting('mpesa_phone_number');
  return phoneNumber || '+254116269694'; // Return default M-Pesa number if not configured
};
