import { FilterOptions, PersistenceService } from '@/app/api/lib/types';
import { todos, tags } from '@/lib/db/schema';
import { eq, desc, sql, and, or, like, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { BasePersistenceService } from '../db/persistence';

// Todo数据类型定义
export type TodoData = typeof todos.$inferSelect;

// 创建输入类型
export type TodoCreateInput = Omit<TodoData, 'id' | 'created_at'>;

// 更新输入类型
export type TodoUpdateInput = Partial<TodoData> & { id: number };

// TodoWithTags接口
export interface TodoWithTags {
  todo: TodoData;
  tags: Array<{
    id: number;
    name: string;
    color: string;
  }>;
}

/**
 * Todo持久化服务
 */
export class TodoPersistenceService extends BasePersistenceService<typeof todos, TodoData> {
  constructor(connectionString?: string) {
    super(db, todos, 'id', 'user_id');
  }

  /**
   * 重写create方法，添加时间戳
   */
  async create(data: Partial<TodoData>): Promise<TodoData> {
    const now = new Date().toISOString();
    return super.create({
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    } as any);
  }

  /**
   * 重写update方法，更新时间戳
   */
  async update(id: string | number, data: Partial<TodoData>): Promise<TodoData> {
    const now = new Date().toISOString();
    return super.update(id, {
      ...data,
      updated_at: now,
    });
  }

  /**
   * 覆盖getWithFilters方法，处理特殊过滤条件
   */
  async getWithFilters(
    filters: FilterOptions,
    userId?: string
  ): Promise<{
    items: TodoData[];
    total: number;
    metadata?: Record<string, any>;
  }> {
    let query = this.db.select().from(todos).$dynamic();
    let countQuery = this.db.select({ count: sql`count(*)` }).from(todos).$dynamic();
    
    // 构建条件数组
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(todos.user_id, userId));
    }
    
    // 处理日期范围
    if (filters.date_from && filters.date_to) {
      conditions.push(and(
        gte(todos.planned_date, filters.date_from),
        lte(todos.planned_date, filters.date_to)
      ));
    } else if (filters.date_from) {
      conditions.push(gte(todos.planned_date, filters.date_from));
    } else if (filters.date_to) {
      conditions.push(lte(todos.planned_date, filters.date_to));
    }
    
    // 处理搜索
    if (filters.search) {
      conditions.push(or(
        like(todos.title, `%${filters.search}%`),
        like(todos.description, `%${filters.search}%`)
      ));
    }
    
    // 处理条件
    if (filters.conditions) {
      for (const condition of filters.conditions) {
        switch (condition.operator) {
          case 'eq':
            conditions.push(eq(todos[condition.field], condition.value));
            break;
          case 'like':
            conditions.push(like(todos[condition.field], `%${condition.value}%`));
            break;
          // 可以添加更多操作符...
        }
      }
    }
    
    // 应用所有条件
    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 
        ? conditions[0] 
        : and(...conditions);
      
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }
    
    const items = await query.orderBy(desc(todos.created_at)) as TodoData[];
    const [countResult] = await countQuery;
    const total = Number(countResult?.count || 0);
    
    return {
      items,
      total,
    };
  }

  /**
   * 覆盖getPageWithFilters方法，处理特殊过滤和分页
   */
  async getPageWithFilters(
    page: number,
    pageSize: number,
    filters: FilterOptions,
    userId?: string
  ): Promise<{
    items: TodoData[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    metadata?: Record<string, any>;
  }> {
    const skip = (page - 1) * pageSize;
    
    let query = this.db.select().from(todos);
    let countQuery = this.db.select({ count: sql`count(*)` }).from(todos);
    
    // 构建条件数组
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(todos.user_id, userId));
    }
    
    if (filters.status) {
      conditions.push(eq(todos.status, filters.status));
    }
    
    if (filters.priority) {
      conditions.push(eq(todos.priority, filters.priority));
    }
    
    if (filters.planned_date) {
      conditions.push(eq(todos.planned_date, filters.planned_date));
    }
    
    // 处理日期范围
    if (filters.date_from && filters.date_to) {
      conditions.push(and(
        gte(todos.planned_date, filters.date_from),
        lte(todos.planned_date, filters.date_to)
      ));
    } else if (filters.date_from) {
      conditions.push(gte(todos.planned_date, filters.date_from));
    } else if (filters.date_to) {
      conditions.push(lte(todos.planned_date, filters.date_to));
    }
    
    // 处理搜索
    if (filters.search) {
      conditions.push(or(
        like(todos.title, `%${filters.search}%`),
        like(todos.description, `%${filters.search}%`)
      ));
    }
    
    // 应用所有条件
    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 
        ? conditions[0] 
        : and(...conditions);
      
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }
    
    const items = await query
      .orderBy(desc(todos.created_at))
      .limit(pageSize)
      .offset(skip) as TodoData[];
    
    const [countResult] = await countQuery;
    const total = Number(countResult?.count || 0);
    
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 根据日期获取 Todo
   */
  async getByDate(date: string, userId: string): Promise<TodoData[]> {
    return this.findMany({
      user_id: userId,
      planned_date: date
    });
  }

  /**
   * 获取 Todo 及其标签
   */
  async getTodoWithTags(todoId: number): Promise<TodoWithTags | null> {
    // 获取Todo项
    const todoItem = await this.findById(todoId);
    
    if (!todoItem) return null;
    
    // 获取关联的标签
    const tagList = await this.db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color
      })
      .from('todo_tags')
      .where(eq('todo_tags.todo_id', todoId))
      .innerJoin(
        tags, 
        eq('todo_tags.tag_id', tags.id)
      );
    
    return {
      todo: todoItem,
      tags: tagList
    };
  }

  // 为了兼容旧接口，添加getById方法
  async getById(id: string | number): Promise<TodoData | null> {
    return this.findById(id);
  }
}
