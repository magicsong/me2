export type HabitCategory = 'health' | 'productivity' | 'mindfulness' | 'learning' | 'social';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  category: HabitCategory;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'scenario';
  userId: string;
  createdAt: string;
  status?: 'active' | 'archived';
  rewardPoints: number;
  checkIns?: Record<string, boolean>; // 使用日期字符串做键，值为是否打卡
}

export interface HabitTier {
  id: number;
  habit_id: number;
  name: string;
  level: number;
  description?: string;
  reward_points: number;
  completion_criteria?: any;
  user_id: string;
  created_at: string;
}

export interface HabitCheckInEntry {
  id: number;
  habit_id: number;
  completed_at: string;
  user_id: string;
  tier_id?: number;
  comment?: string;
  tier_name?: string;
  tier_level?: number;
}
