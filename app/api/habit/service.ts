import { BaseApiHandler } from '@/app/api/lib/BaseApiHandler';
import { v4 as uuidv4 } from 'uuid';
import { Habit, HabitPersistenceService } from '@/lib/persist/habit';
import { HabitBO } from './types';
import { HabitPromptBuilder, HabitOutputParser } from './ai';

/**
 * 习惯API处理器
 */
export class HabitApiHandler extends BaseApiHandler<Habit, HabitBO> {
  constructor(
    persistenceService: HabitPersistenceService,
    promptBuilder: HabitPromptBuilder,
    outputParser: HabitOutputParser
  ) {
    super(persistenceService, promptBuilder, outputParser);
  }

  protected validateInput(data: Partial<Habit>): boolean {
    // 验证必要字段
    if (!data.name || data.name.trim() === '') {
      return false;
    }

    if (!data.user_id) {
      return false;
    }

    return true;
  }

  protected async getExistingData(id: string): Promise<Habit> {
    const habit = await (this.persistenceService as HabitPersistenceService).get(id);
    if (!habit) {
      throw new Error(`习惯ID ${id} 不存在`);
    }
    return habit;
  }

  protected generateId(): string {
    return uuidv4(); // 使用UUID作为标识符
  }

  protected resourceName(): string {
    return 'habit';
  }
  
  // 暴露持久化服务以便在路由处理中使用
  getPersistenceService(): HabitPersistenceService {
    return this.persistenceService as HabitPersistenceService;
  }

  // 实现业务对象和数据对象转换方法
  toBusinessObject(dataObject: Habit): HabitBO {
    return {
      id: dataObject.id,
      name: dataObject.name,
      description: dataObject.description,
      frequency: dataObject.frequency,
      createdAt: dataObject.created_at,
      userId: dataObject.user_id,
      category: dataObject.category,
      rewardPoints: dataObject.reward_points,
      status: dataObject.status
    };
  }

  toDataObject(businessObject: HabitBO): Partial<Habit> {
    return {
      id: businessObject.id,
      name: businessObject.name,
      description: businessObject.description,
      frequency: businessObject.frequency,
      created_at: businessObject.createdAt,
      user_id: businessObject.userId,
      category: businessObject.category,
      reward_points: businessObject.rewardPoints,
      status: businessObject.status
    };
  }

  toBusinessObjects(dataObjects: Habit[]): HabitBO[] {
    return dataObjects.map(dataObject => this.toBusinessObject(dataObject));
  }

  toDataObjects(businessObjects: HabitBO[]): Partial<Habit>[] {
    return businessObjects.map(businessObject => this.toDataObject(businessObject));
  }
}

// 创建API处理器的工厂函数
export function createHabitApiHandler(): HabitApiHandler {
  const persistenceService = new HabitPersistenceService();
  const promptBuilder = new HabitPromptBuilder();
  const outputParser = new HabitOutputParser();
  
  return new HabitApiHandler(persistenceService, promptBuilder, outputParser);
}
