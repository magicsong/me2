import { BusinessObject } from "../lib/types";

/**
 * 习惯业务对象类型 - 使用驼峰命名风格
 */
export interface HabitBO extends BusinessObject {
  id?: number;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'scenario';
  createdAt?: string;
  userId: string;
  category?: string;
  rewardPoints: number;
  status: 'active' | 'inactive' | 'archived';
}
