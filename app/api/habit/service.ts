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

    // 验证奖励点数
    if (data.reward_points !== undefined && (isNaN(data.reward_points) || data.reward_points < 0)) {
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

  // 打卡功能
  async checkIn(habitId: string, date: string): Promise<HabitBO> {
    const habit = await this.getExistingData(habitId);
    
    // 如果没有check_ins字段，初始化它
    if (!habit.check_ins) {
      habit.check_ins = {};
    }
    
    // 添加或更新打卡记录
    habit.check_ins[date] = true;
    
    const updatedHabit = await this.persistenceService.update(habitId, { check_ins: habit.check_ins });
    return this.toBusinessObject(updatedHabit);
  }

  // 取消打卡功能
  async cancelCheckIn(habitId: string, date: string): Promise<HabitBO> {
    const habit = await this.getExistingData(habitId);
    
    // 如果已经存在check_ins并且有指定日期的记录，则删除它
    if (habit.check_ins && habit.check_ins[date]) {
      delete habit.check_ins[date];
      
      const updatedHabit = await this.persistenceService.update(habitId, { check_ins: habit.check_ins });
      return this.toBusinessObject(updatedHabit);
    }
    
    return this.toBusinessObject(habit);
  }

  // 获取用户所有习惯的打卡统计
  async getCheckInStats(userId: string): Promise<any> {
    const habits = await this.persistenceService.getByUserId(userId);
    
    const stats = {
      totalCheckins: 0,
      totalPoints: 0,
      streaks: {},
      habitStats: {}
    };
    
    habits.forEach(habit => {
      const checkins = habit.check_ins || {};
      const checkinDates = Object.keys(checkins);
      
      stats.habitStats[habit.id] = {
        name: habit.name,
        category: habit.category,
        totalCheckins: checkinDates.length,
        points: checkinDates.length * (habit.reward_points || 1)
      };
      
      stats.totalCheckins += checkinDates.length;
      stats.totalPoints += stats.habitStats[habit.id].points;
    });
    
    return stats;
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
      category: dataObject.category || 'productivity', // 提供默认值
      rewardPoints: dataObject.reward_points || 0, // 确保有默认值
      status: dataObject.status,
      checkIns: dataObject.check_ins || {},
      todayCheckedIn: dataObject.todayCheckedIn || false // 添加今日打卡状态
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
      reward_points: businessObject.rewardPoints || 0, // 确保有默认值
      status: businessObject.status,
      check_ins: businessObject.checkIns
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
