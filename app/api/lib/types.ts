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
