import { FilterOptions} from '@/app/api/lib/types';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';
import { BaseRepository } from './base';
import { PersistenceService } from './intf';

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
}
