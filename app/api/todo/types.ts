import { BusinessObject } from '../lib/types';

// Todo 业务对象
export interface TodoBO extends BusinessObject {
  id: number;
  userId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
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
