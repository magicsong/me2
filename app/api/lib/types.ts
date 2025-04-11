import { NextRequest, NextResponse } from 'next/server';

/**
 * 基础请求接口
 */
export interface BaseRequest<T> {
  data?: T | T[]; // 单条或批量数据
  autoGenerate?: boolean; // 是否需要LLM自动生成
  batchSize?: number; // 自动生成时的批量大小
  userPrompt?: string; // 用户给大模型的提示
}

/**
 * 基础响应接口
 */
export interface BaseResponse<T> {
  success: boolean;
  data?: T | T[];
  error?: string;
  generatedCount?: number;
}

/**
 * 通用过滤器类型，支持基本操作符
 */
export type FilterOperator = 
  | 'eq'     // 等于
  | 'neq'    // 不等于
  | 'gt'     // 大于
  | 'gte'    // 大于等于
  | 'lt'     // 小于
  | 'lte'    // 小于等于
  | 'like'   // 模糊匹配
  | 'in'     // 在列表中
  | 'between'; // 在范围内

/**
 * 单个过滤条件
 */
export interface FilterCondition {
  field: string;           // 字段名
  operator: FilterOperator; // 操作符
  value: any;              // 比较值
}

/**
 * 过滤选项，支持多个条件的组合
 */
export interface FilterOptions {
  conditions?: FilterCondition[];  // 过滤条件
  sortBy?: string;                 // 排序字段
  sortDirection?: 'asc' | 'desc';  // 排序方向
  limit?: number;                  // 限制结果数量
  offset?: number;                 // 结果偏移量
}

/**
 * 持久化服务接口
 */
export interface PersistenceService<T> {
  create(data: Partial<T>): Promise<T>;
  createMany(data: Partial<T>[]): Promise<T[]>;
  get(id: string | number): Promise<T | null>;
  getAll(userId?: string): Promise<T[]>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  updateMany(updates: { id: string | number; data: Partial<T> }[]): Promise<T[]>;
  delete(id: string | number): Promise<boolean>;
  
  // 可选的分页方法
  getPage?(page: number, pageSize: number, userId?: string): Promise<{
      items: T[];
      total: number;
  }>;
  
  // 可选的根据用户ID获取方法
  getByUserId?(userId: string): Promise<T[]>;
  
  // 新增：通用过滤方法，支持复杂查询条件
  getWithFilters?(
    filters: FilterOptions,
    userId?: string
  ): Promise<{
    items: T[];
    total: number;
    metadata?: Record<string, any>;
  }>;
  
  // 新增：带分页的通用过滤方法
  getPageWithFilters?(
    page: number,
    pageSize: number,
    filters: FilterOptions,
    userId?: string
  ): Promise<{
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    metadata?: Record<string, any>;
  }>;
}

/**
 * 提示构建器接口
 */
export interface PromptBuilder<T> {
  buildCreatePrompt(): string;
  buildUpdatePrompt(): string;
}

/**
 * 输出解析器接口
 */
export interface OutputParser<T> {
  parseCreateOutput(output: string): Partial<T>;
  parseUpdateOutput(output: string, existingData: T): Partial<T>;
  parse?(output: string): Partial<T>; // 添加通用解析方法
  
  // 新增：数组支持
  parseCreateOutputArray?(output: string): Partial<T>[];
  parseUpdateOutputArray?(output: string, existingDataArray: T[]): Partial<T>[];
  parseArray?(output: string): Partial<T>[]; // 通用数组解析方法
}

/**
 * 业务对象类型定义 - 使用驼峰命名法
 */
export interface BusinessObject {
  id?: string | number;
  userId?: string;
  createdAt?: string;
}

/**
 * 通用的业务层和数据层对象转换接口
 */
export interface ObjectConverter<BO extends BusinessObject, DO> {
  toBusinessObject(dataObject: DO): BO;
  toDataObject(businessObject: BO): Partial<DO>;
  toBusinessObjects(dataObjects: DO[]): BO[];
  toDataObjects(businessObjects: BO[]): Partial<DO>[];
}
