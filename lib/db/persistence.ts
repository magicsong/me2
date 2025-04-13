import { PersistenceService, FilterOptions } from '@/app/api/lib/types';
import { BaseRepository, FilterCondition, PaginationOptions } from './base';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, like, gte, lte, desc } from 'drizzle-orm';

/**
 * 基础持久化服务类
 * 提供了PersistenceService接口的标准实现，基于BaseRepository
 */
export class BasePersistenceService<
  T extends PgTableWithColumns<any>,
  I extends Record<string, any>
> extends BaseRepository<T, I> implements PersistenceService<I> {
  
  /**
   * 创建基础持久化服务
   * @param table 表对象
   * @param primaryKey 主键字段名，默认为'id'
   * @param userIdField 用户ID字段名，默认为'user_id'
   */
  constructor(
    table: T, 
    primaryKey: keyof I = 'id' as keyof I,
    protected userIdField: keyof I = 'user_id' as keyof I
  ) {
    super(table, primaryKey);
  }

  /**
   * 根据ID获取记录（兼容旧接口）
   */
  async get(id: string | number): Promise<I | null> {
    return this.findById(id);
  }

  /**
   * 获取所有记录
   */
  async getAll(userId?: string): Promise<I[]> {
    if (userId) {
      const filter = { [this.userIdField]: userId } as FilterCondition<I>;
      return this.findMany(filter);
    }
    return this.findMany({});
  }

  /**
   * 根据用户ID获取记录
   */
  async getByUserId(userId: string): Promise<I[]> {
    const filter = { [this.userIdField]: userId } as FilterCondition<I>;
    return this.findMany(filter);
  }

  /**
   * 分页获取记录
   */
  async getPage(
    page: number,
    pageSize: number,
    userId?: string
  ): Promise<{
    items: I[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const filter = userId 
      ? { [this.userIdField]: userId } as FilterCondition<I>
      : {};
      
    const result = await this.findWithPagination(filter, {
      page,
      pageSize,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });
    
    return {
      items: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    };
  }

  /**
   * 实现更新接口，确保符合PersistenceService规范
   */
  async update(id: string | number, data: Partial<I>): Promise<I> {
    const result = await super.update(Number(id), data);
    if (!result) {
      throw new Error(`记录不存在: ${id}`);
    }
    return result;
  }

  /**
   * 删除记录
   */
  async delete(id: string | number): Promise<I> {
    const result = await super.delete(Number(id));
    if (!result) {
      throw new Error(`记录不存在: ${id}`);
    }
    return result;
  }

  /**
   * 将通用过滤选项转换为BaseRepository的过滤条件
   */
  protected convertToFilterCondition(filters: FilterOptions, userId?: string): FilterCondition<I> {
    const result: Record<string, any> = {};
    
    if (userId) {
      result[this.userIdField as string] = userId;
    }
    
    if (filters.conditions) {
      for (const condition of filters.conditions) {
        const { field, operator, value } = condition;
        
        if (!result[field]) {
          result[field] = {};
        }
        
        // 简单映射操作符到过滤条件
        switch (operator) {
          case 'eq':
            result[field] = value;
            break;
          case 'neq':
            result[field].neq = value;
            break;
          case 'gt':
            result[field].gt = value;
            break;
          case 'gte':
            result[field].gte = value;
            break;
          case 'lt':
            result[field].lt = value;
            break;
          case 'lte':
            result[field].lte = value;
            break;
          case 'like':
            result[field].like = value;
            break;
          case 'in':
            result[field].in = value;
            break;
        }
      }
    }
    
    return result as FilterCondition<I>;
  }
  
  /**
   * 使用通用过滤器获取记录
   */
  async getWithFilters(
    filters: FilterOptions,
    userId?: string
  ): Promise<{
    items: I[];
    total: number;
    metadata?: Record<string, any>;
  }> {
    // 对于复杂的过滤逻辑，子类可以覆盖此方法
    const filter = this.convertToFilterCondition(filters, userId);
    const items = await this.findMany(filter);
    const total = items.length;
    
    return {
      items,
      total
    };
  }

  /**
   * 带分页的通用过滤方法
   */
  async getPageWithFilters(
    page: number,
    pageSize: number,
    filters: FilterOptions,
    userId?: string
  ): Promise<{
    items: I[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    metadata?: Record<string, any>;
  }> {
    // 对于复杂的过滤逻辑，子类可以覆盖此方法
    const filter = this.convertToFilterCondition(filters, userId);
    const paginationOptions: PaginationOptions = {
      page,
      pageSize,
      sortBy: filters.sortBy,
      sortOrder: filters.sortDirection === 'desc' ? 'desc' : 'asc'
    };
    
    const result = await this.findWithPagination(filter, paginationOptions);
    
    return {
      items: result.data,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages
    };
  }
}
