export interface Habit {
  id: string;
  name: string;
  description?: string;
  frequency?: string;  // 频率: daily, weekly, weekly:1,3,5, monthly 等
  status: "active" | "archived" | "completed";
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
  category?: string;
  rewardPoints: number;
  checkIns?: Record<string, boolean>; // 打卡记录
  todayCheckedIn: boolean; // 标记今天是否已打卡
  streak: number; // 连续打卡天数
}

export type HabitCategory = 'health' | 'productivity' | 'mindfulness' | 'learning' | 'social';

