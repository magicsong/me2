import { db } from "@/lib/db";
import { ai_insights } from "@/lib/db/schema";
import { PersistenceService } from "@/app/api/lib/types";
import { and, eq, gte, lte } from "drizzle-orm";
import { AIInsightDO } from "./types";

export class AIInsightPersistenceService implements PersistenceService<AIInsightDO> {
  async create(data: Partial<AIInsightDO>): Promise<AIInsightDO> {
    const [result] = await db.insert(ai_insights).values(data).returning();
    return result;
  }

  async createMany(data: Partial<AIInsightDO>[]): Promise<AIInsightDO[]> {
    return await db.insert(ai_insights).values(data).returning();
  }

  async get(id: string | number): Promise<AIInsightDO | null> {
    const [result] = await db.select().from(ai_insights).where(eq(ai_insights.id, Number(id)));
    return result || null;
  }

  async getAll(userId?: string): Promise<AIInsightDO[]> {
    if (userId) {
      return await db.select().from(ai_insights).where(eq(ai_insights.user_id, userId));
    }
    return await db.select().from(ai_insights);
  }

  async update(id: string | number, data: Partial<AIInsightDO>): Promise<AIInsightDO> {
    const [result] = await db
      .update(ai_insights)
      .set({ ...data, updated_at: new Date().toISOString() })
      .where(eq(ai_insights.id, Number(id)))
      .returning();
    return result;
  }

  async updateMany(updates: { id: string | number; data: Partial<AIInsightDO> }[]): Promise<AIInsightDO[]> {
    const results: AIInsightDO[] = [];
    
    // 逐个更新，因为批量更新在这种情况下较复杂
    for (const update of updates) {
      const result = await this.update(update.id, update.data);
      results.push(result);
    }
    
    return results;
  }

  async delete(id: string | number): Promise<boolean> {
    await db.delete(ai_insights).where(eq(ai_insights.id, Number(id)));
    return true;
  }

  async getByUserId(userId: string): Promise<AIInsightDO[]> {
    return await db.select().from(ai_insights).where(eq(ai_insights.user_id, userId));
  }

  async getPage(page: number, pageSize: number, userId?: string): Promise<{
    items: AIInsightDO[];
    total: number;
  }> {
    const offset = (page - 1) * pageSize;
    
    let query = db.select().from(ai_insights);
    if (userId) {
      query = query.where(eq(ai_insights.user_id, userId));
    }
    
    const items = await query.limit(pageSize).offset(offset);
    
    let countQuery = db.select({ count: db.fn.count() }).from(ai_insights);
    if (userId) {
      countQuery = countQuery.where(eq(ai_insights.user_id, userId));
    }
    
    const [{ count }] = await countQuery;
    
    return {
      items,
      total: Number(count)
    };
  }

  // 根据过滤条件获取数据
  async getWithFilters(
    page: number | null, 
    pageSize: number | null, 
    userId: string, 
    filters: Record<string, any> = {}
  ): Promise<{
    items: AIInsightDO[];
    total: number;
    page?: number;
    pageSize?: number;
  }> {
    // 构建查询条件
    let conditions = [eq(ai_insights.user_id, userId)];
    
    // 添加时间过滤
    if (filters.timePeriodStart) {
      conditions.push(gte(ai_insights.time_period_start, filters.timePeriodStart));
    }
    if (filters.timePeriodEnd) {
      conditions.push(lte(ai_insights.time_period_end, filters.timePeriodEnd));
    }
    
    // 添加类型过滤
    if (filters.kind) {
      conditions.push(eq(ai_insights.kind, filters.kind));
    }
    
    // 执行查询
    let query = db.select().from(ai_insights).where(and(...conditions));
    
    // 如果需要分页
    if (page !== null && pageSize !== null) {
      const offset = (page - 1) * pageSize;
      const items = await query.limit(pageSize).offset(offset);
      
      // 获取总数
      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(ai_insights)
        .where(and(...conditions));
      
      return {
        items,
        total: Number(count),
        page,
        pageSize
      };
    } else {
      // 不分页，返回所有结果
      const items = await query;
      return {
        items,
        total: items.length
      };
    }
  }
}
