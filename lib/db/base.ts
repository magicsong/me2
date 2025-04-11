import { sql, eq, and, or, desc, asc, SQL } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTableWithColumns } from 'drizzle-orm/pg-core';

// 分页结果接口
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 排序类型
export type SortOrder = 'asc' | 'desc';

// 分页选项
export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}

// 过滤条件
export type FilterCondition<T> = Partial<{
  [K in keyof T]: T[K] | { eq?: T[K]; neq?: T[K]; gt?: T[K]; gte?: T[K]; lt?: T[K]; lte?: T[K]; in?: T[K][]; like?: string }
}>;

// 基础仓库类
export class BaseRepository<T extends PgTableWithColumns<any>, I extends Record<string, any>> {
  protected db: NodePgDatabase;
  protected table: T;
  protected primaryKey: keyof I;

  constructor(db: NodePgDatabase, table: T, primaryKey: keyof I = 'id' as keyof I) {
    this.db = db;
    this.table = table;
    this.primaryKey = primaryKey;
  }

  // 创建记录
  async create(data: Partial<I>): Promise<I> {
    const result = await this.db.insert(this.table).values(data as any).returning();
    return result[0] as I;
  }

  // 批量创建记录
  async createMany(data: Partial<I>[]): Promise<I[]> {
    const result = await this.db.insert(this.table).values(data as any).returning();
    return result as I[];
  }

  // 通过ID查找记录
  async findById(id: any): Promise<I | null> {
    const result = await this.db
      .select()
      .from(this.table)
      .where(eq(this.table[this.primaryKey as string] as any, id))
      .limit(1);
    
    return result.length > 0 ? (result[0] as I) : null;
  }

  // 查找单条记录
  async findOne(filter: FilterCondition<I>): Promise<I | null> {
    const condition = this.buildWhereCondition(filter);
    const result = await this.db
      .select()
      .from(this.table)
      .where(condition)
      .limit(1);
    
    return result.length > 0 ? (result[0] as I) : null;
  }

  // 查找多条记录
  async findMany(filter: FilterCondition<I> = {}): Promise<I[]> {
    const condition = this.buildWhereCondition(filter);
    const result = await this.db
      .select()
      .from(this.table)
      .where(condition);
    
    return result as I[];
  }

  // 分页查询
  async findWithPagination(
    filter: FilterCondition<I> = {},
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<I>> {
    const { page = 1, pageSize = 10, sortBy, sortOrder = 'asc' } = options;
    const offset = (page - 1) * pageSize;
    const condition = this.buildWhereCondition(filter);
    
    // 计算总数
    const countResult = await this.db
      .select({ count: SQL`count(*)` })
      .from(this.table)
      .where(condition);
    
    const total = Number(countResult[0].count);
    
    // 构建排序
    let query = this.db
      .select()
      .from(this.table)
      .where(condition)
      .limit(pageSize)
      .offset(offset);
    
    if (sortBy) {
      query = query.orderBy(
        sortOrder === 'desc' 
          ? desc(this.table[sortBy as string] as any)
          : asc(this.table[sortBy as string] as any)
      );
    }
    
    const data = await query;
    
    return {
      data: data as I[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 更新记录
  async update(id: any, data: Partial<I>): Promise<I | null> {
    const result = await this.db
      .update(this.table)
      .set(data as any)
      .where(eq(this.table[this.primaryKey as string] as any, id))
      .returning();
    
    return result.length > 0 ? (result[0] as I) : null;
  }

  // 批量更新记录
  async updateMany(filter: FilterCondition<I>, data: Partial<I>): Promise<I[]> {
    const condition = this.buildWhereCondition(filter);
    const result = await this.db
      .update(this.table)
      .set(data as any)
      .where(condition)
      .returning();
    
    return result as I[];
  }

  // 删除记录
  async delete(id: any): Promise<I | null> {
    const result = await this.db
      .delete(this.table)
      .where(eq(this.table[this.primaryKey as string] as any, id))
      .returning();
    
    return result.length > 0 ? (result[0] as I) : null;
  }

  // 批量删除记录
  async deleteMany(filter: FilterCondition<I>): Promise<I[]> {
    const condition = this.buildWhereCondition(filter);
    const result = await this.db
      .delete(this.table)
      .where(condition)
      .returning();
    
    return result as I[];
  }

  // 构建where条件
  protected buildWhereCondition(filter: FilterCondition<I>): SQL {
    const conditions: SQL[] = [];
    
    for (const [key, value] of Object.entries(filter)) {
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        const complexFilter = value as any;
        
        if (complexFilter.eq !== undefined) {
          conditions.push(eq(this.table[key] as any, complexFilter.eq));
        }
        if (complexFilter.neq !== undefined) {
          conditions.push(sql`${this.table[key]} <> ${complexFilter.neq}`);
        }
        if (complexFilter.gt !== undefined) {
          conditions.push(sql`${this.table[key]} > ${complexFilter.gt}`);
        }
        if (complexFilter.gte !== undefined) {
          conditions.push(sql`${this.table[key]} >= ${complexFilter.gte}`);
        }
        if (complexFilter.lt !== undefined) {
          conditions.push(sql`${this.table[key]} < ${complexFilter.lt}`);
        }
        if (complexFilter.lte !== undefined) {
          conditions.push(sql`${this.table[key]} <= ${complexFilter.lte}`);
        }
        if (complexFilter.in !== undefined) {
          conditions.push(sql`${this.table[key]} IN ${complexFilter.in}`);
        }
        if (complexFilter.like !== undefined) {
          conditions.push(sql`${this.table[key]} LIKE ${`%${complexFilter.like}%`}`);
        }
      } else {
        conditions.push(eq(this.table[key] as any, value));
      }
    }
    
    return conditions.length ? and(...conditions) : sql`1=1`;
  }
}
