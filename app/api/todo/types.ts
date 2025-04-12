import { BusinessObject } from '../lib/types';

// Todo 数据模型
export interface TodoData {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  planned_date?: string;
  planned_start_time?: string;
  planned_end_time?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  tag_ids?: number[];
}

// Todo 业务对象
export interface TodoBO extends BusinessObject {
  id: number;
  userId: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  plannedDate?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  tagIds?: number[];
  tags: { id: number; name: string; color: string }[];
}

// 批量处理Todo请求
export interface BatchTodoRequest {
  todos: Partial<TodoBO>[];
}
