export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          phone?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          phone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          phone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_plans: {
        Row: {
          id: string;
          name: string;
          price: number;
          currency: string;
          duration_months: number;
          features: string[];
          is_popular: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          currency: string;
          duration_months: number;
          features: string[];
          is_popular?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          currency?: string;
          duration_months?: number;
          features?: string[];
          is_popular?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_applications: {
        Row: {
          id: string;
          user_id: string;
          subscription_plan_id: string;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_plan_id: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_plan_id?: string;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_submissions: {
        Row: {
          id: string;
          user_id: string;
          subscription_plan_id: string;
          mpesa_number: string;
          mpesa_message: string;
          amount: number;
          status: 'pending' | 'verified' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subscription_plan_id: string;
          mpesa_number: string;
          mpesa_message: string;
          amount: number;
          status?: 'pending' | 'verified' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subscription_plan_id?: string;
          mpesa_number?: string;
          mpesa_message?: string;
          amount?: number;
          status?: 'pending' | 'verified' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
      };
      user_balances: {
        Row: {
          id: string;
          user_id: string;
          plan_balance: number;
          available_balance: number;
          total_earned: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_balance?: number;
          available_balance?: number;
          total_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_balance?: number;
          available_balance?: number;
          total_earned?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          level: number;
          status: 'pending' | 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          level: number;
          status?: 'pending' | 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          level?: number;
          status?: 'pending' | 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
      };
      referral_rewards: {
        Row: {
          id: string;
          referrer_id: string;
          referred_id: string;
          referral_level: number;
          referred_plan_amount: number;
          reward_amount: number;
          status: 'pending' | 'paid' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          referrer_id: string;
          referred_id: string;
          referral_level: number;
          referred_plan_amount: number;
          reward_amount: number;
          status?: 'pending' | 'paid' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          referrer_id?: string;
          referred_id?: string;
          referral_level?: number;
          referred_plan_amount?: number;
          reward_amount?: number;
          status?: 'pending' | 'paid' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
      };
      video_links: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          video_url: string;
          duration_minutes: number;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          video_url: string;
          duration_minutes?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          video_url?: string;
          duration_minutes?: number;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      task_completions: {
        Row: {
          id: string;
          user_id: string;
          task_type: string;
          task_date: string;
          reward_amount: number;
          status: string;
          video_link_id: string | null;
          daily_task_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_type: string;
          task_date: string;
          reward_amount: number;
          status?: string;
          video_link_id?: string | null;
          daily_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_type?: string;
          task_date?: string;
          reward_amount?: number;
          status?: string;
          video_link_id?: string | null;
          daily_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      withdrawal_requests: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          tax_amount: number;
          net_amount: number;
          mpesa_number: string;
          status: 'pending' | 'processing' | 'completed' | 'rejected';
          processed_by?: string;
          processed_at?: string;
          notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          tax_amount: number;
          net_amount: number;
          mpesa_number: string;
          status?: 'pending' | 'processing' | 'completed' | 'rejected';
          processed_by?: string;
          processed_at?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          tax_amount?: number;
          net_amount?: number;
          mpesa_number?: string;
          status?: 'pending' | 'processing' | 'completed' | 'rejected';
          processed_by?: string;
          processed_at?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      balance_transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: 'referral_reward' | 'task_reward' | 'withdrawal' | 'subscription_payment';
          amount: number;
          balance_before: number;
          balance_after: number;
          reference_id?: string;
          reference_table?: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          transaction_type: 'referral_reward' | 'task_reward' | 'withdrawal' | 'subscription_payment';
          amount: number;
          balance_before: number;
          balance_after: number;
          reference_id?: string;
          reference_table?: string;
          description: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?: 'referral_reward' | 'task_reward' | 'withdrawal' | 'subscription_payment';
          amount?: number;
          balance_before?: number;
          balance_after?: number;
          reference_id?: string;
          reference_table?: string;
          description?: string;
          created_at?: string;
        };
      };
      daily_tasks: {
        Row: {
          id: string;
          title: string;
          description?: string;
          task_date: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          created_by?: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          task_date?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          task_date?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          question_text: string;
          question_type: string;
          options?: string[];
          is_required: boolean;
          order_index: number;
          is_active: boolean;
          daily_task_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question_text: string;
          question_type?: string;
          options?: string[];
          is_required?: boolean;
          order_index?: number;
          is_active?: boolean;
          daily_task_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question_text?: string;
          question_type?: string;
          options?: string[];
          is_required?: boolean;
          order_index?: number;
          is_active?: boolean;
          daily_task_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_responses: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          daily_task_id: string;
          response_text?: string;
          response_options?: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          daily_task_id: string;
          response_text?: string;
          response_options?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_id?: string;
          daily_task_id?: string;
          response_text?: string;
          response_options?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      calculate_referral_reward: {
        Args: {
          plan_amount: number;
          referral_level: number;
        };
        Returns: number;
      };
      calculate_task_reward: {
        Args: {
          plan_amount: number;
          task_type: string;
        };
        Returns: number;
      };
      get_user_plan_amount: {
        Args: {
          user_uuid: string;
        };
        Returns: number;
      };
      process_referral_rewards: {
        Args: {
          referred_user_id: string;
        };
        Returns: undefined;
      };
      process_task_completion: {
        Args: {
          user_uuid: string;
          task_type_param: string;
          video_link_id_param?: string;
          daily_task_id_param?: string;
        };
        Returns: number;
      };
      process_withdrawal_request: {
        Args: {
          user_uuid: string;
          amount_param: number;
          mpesa_number_param: string;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: 'admin' | 'customer';
    };
    CompositeTypes: {};
  };
}