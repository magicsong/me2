import { BaseApiHandler } from '../lib/BaseApiHandler';
import { BusinessObject } from '../lib/types';
import { TodoPersistenceService } from './service';
import { TodoPromptBuilder, TodoOutputParser } from './prompt';
import { TodoData, TodoBO, TodoWithTags } from './types';

export class TodoApiHandler extends BaseApiHandler<TodoData, TodoBO> {
  protected validateInput(data: any): boolean {
    if (!data) return false;
    
    // title 是必需的
    if (!data.title) return false;
    
    // 验证 status 的有效性
    if (data.status && !['active', 'completed', 'archived'].includes(data.status)) {
      return false;
    }
    
    // 验证 priority 的有效性
    if (data.priority && !['urgent', 'high', 'medium', 'low'].includes(data.priority)) {
      return false;
    }
    
    return true;
  }

  protected async getExistingData(id: string): Promise<TodoData> {
    const todo = await this.persistenceService.getById(id);
    
    if (!todo) {
      throw new Error(`未找到 ID 为 ${id} 的待办事项`);
    }
    
    return todo;
  }

  protected generateId(): string {
    // 在这个实现中，我们依赖于数据库来生成 ID
    return '';
  }

  protected resourceName(): string {
    return 'todo';
  }

  toBusinessObject(dataObject: TodoData): TodoBO {
    return {
      id: dataObject.id,
      userId: dataObject.user_id,
      title: dataObject.title,
      description: dataObject.description,
      status: dataObject.status,
      priority: dataObject.priority,
      plannedDate: dataObject.planned_date,
      plannedStartTime: dataObject.planned_start_time,
      plannedEndTime: dataObject.planned_end_time,
      completedAt: dataObject.completed_at,
      createdAt: dataObject.created_at,
      updatedAt: dataObject.updated_at,
      tagIds: dataObject.tag_ids,
    };
  }

  toDataObject(businessObject: TodoBO): Partial<TodoData> {
    return {
      id: businessObject.id,
      user_id: businessObject.userId,
      title: businessObject.title,
      description: businessObject.description,
      status: businessObject.status,
      priority: businessObject.priority,
      planned_date: businessObject.plannedDate,
      planned_start_time: businessObject.plannedStartTime,
      planned_end_time: businessObject.plannedEndTime,
      completed_at: businessObject.completedAt,
      tag_ids: businessObject.tagIds,
    };
  }

  toBusinessObjects(dataObjects: TodoData[]): TodoBO[] {
    return dataObjects.map(data => this.toBusinessObject(data));
  }

  toDataObjects(businessObjects: TodoBO[]): Partial<TodoData>[] {
    return businessObjects.map(bo => this.toDataObject(bo));
  }

  // 获取特定日期的所有待办事项
  async getTodosByDate(date: string, userId: string): Promise<TodoBO[]> {
    try {
      // 确保 persistenceService 具有 getByDate 方法
      const todoService = this.persistenceService as TodoPersistenceService;
      if (typeof todoService.getByDate !== 'function') {
        throw new Error('持久化服务不支持按日期获取待办事项');
      }
      
      const todos = await todoService.getByDate(date, userId);
      return this.toBusinessObjects(todos);
    } catch (error) {
      console.error('获取日期待办事项失败:', error);
      return [];
    }
  }

  // 批量更新待办事项
  async batchUpdateTodos(todos: Partial<TodoBO>[]): Promise<TodoBO[]> {
    try {
      const updateOperations = todos.map(todo => ({
        id: todo.id!,
        data: this.toDataObject(todo as TodoBO)
      }));
      
      const updatedTodos = await this.persistenceService.updateMany(updateOperations);
      return this.toBusinessObjects(updatedTodos);
    } catch (error) {
      console.error('批量更新待办事项失败:', error);
      throw error;
    }
  }

  // 获取待办事项及其标签
  async getTodoWithTags(todoId: number): Promise<TodoWithTags | null> {
    try {
      const todoService = this.persistenceService as TodoPersistenceService;
      if (typeof todoService.getTodoWithTags !== 'function') {
        throw new Error('持久化服务不支持获取待办事项及其标签');
      }
      
      return await todoService.getTodoWithTags(todoId);
    } catch (error) {
      console.error('获取待办事项及其标签失败:', error);
      return null;
    }
  }

  static override create<TodoData, TodoBO extends BusinessObject>(): BaseApiHandler<TodoData, TodoBO> {
    const persistenceService = new TodoPersistenceService();
    const promptBuilder = new TodoPromptBuilder();
    const outputParser = new TodoOutputParser();
    
    return new TodoApiHandler(
      persistenceService,
      promptBuilder,
      outputParser
    ) as unknown as BaseApiHandler<TodoData, TodoBO>;
  }
}
