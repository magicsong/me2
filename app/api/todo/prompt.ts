import { PromptBuilder, OutputParser } from '../lib/types';
import { TodoData } from './types';

export class TodoPromptBuilder implements PromptBuilder<TodoData> {
  build(): string {
    return `
    你是一个任务管理助手，请帮助用户创建和管理他们的待办事项。
    请理解用户的需求，并根据输入生成相应的待办事项。
    `;
  }

  buildCreatePrompt(): string {
    return `
    请根据以下提示创建一个新的待办事项。如果提供了部分信息，请根据这些信息填充其余字段。
    
    待办事项应该包含以下字段：
    - title: 任务标题
    - description: 任务描述（可选）
    - status: 任务状态，可选值为 'active', 'completed', 'archived'，默认为 'active'
    - priority: 任务优先级，可选值为 'urgent', 'high', 'medium', 'low'，默认为 'medium'
    - planned_date: 计划完成日期，格式为 YYYY-MM-DD（可选）
    - planned_start_time: 计划开始时间，ISO 格式（可选）
    - planned_end_time: 计划结束时间，ISO 格式（可选）
    
    请根据用户的输入 {{userPrompt}} 以及可能提供的部分信息生成一个合理的待办事项。
    回复格式应为 JSON 对象，包含上述字段。
    `;
  }

  buildUpdatePrompt(): string {
    return `
    请根据以下提示更新一个已有的待办事项。
    
    待办事项可能包含以下字段：
    - title: 任务标题
    - description: 任务描述
    - status: 任务状态，可选值为 'active', 'completed', 'archived'
    - priority: 任务优先级，可选值为 'urgent', 'high', 'medium', 'low'
    - planned_date: 计划完成日期，格式为 YYYY-MM-DD
    - planned_start_time: 计划开始时间，ISO 格式
    - planned_end_time: 计划结束时间，ISO 格式
    - completed_at: 完成时间，ISO 格式
    
    请根据用户的输入 {{userPrompt}} 以及已提供的部分更新信息，生成更新后的内容。
    只需包含应该更新的字段。
    回复格式应为 JSON 对象，包含需要更新的字段。
    `;
  }
}

export class TodoOutputParser implements OutputParser<TodoData> {
  parse(output: string): Partial<TodoData> {
    try {
      // 尝试直接解析 JSON
      return JSON.parse(output);
    } catch (error) {
      // 如果直接解析失败，尝试从文本中提取 JSON
      const jsonMatch = output.match(/```(?:json)?([\s\S]*?)```/) || output.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0].replace(/```json|```/g, '').trim());
        } catch (innerError) {
          console.error('解析 JSON 失败:', innerError);
          throw new Error('无法解析 LLM 输出为有效的 JSON');
        }
      }
      
      console.error('未找到有效的 JSON 输出:', output);
      throw new Error('LLM 输出中未找到有效的 JSON');
    }
  }

  parseCreateOutput(output: string): Partial<TodoData> {
    const todoData = this.parse(output);
    
    // 确保必要字段
    if (!todoData.title) {
      throw new Error('创建的待办事项必须包含标题');
    }
    
    // 设置默认值
    return {
      ...todoData,
      status: todoData.status || 'active',
      priority: todoData.priority || 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  parseUpdateOutput(output: string, existingData: TodoData): Partial<TodoData> {
    const updateData = this.parse(output);
    
    // 如果状态变为已完成且没有提供完成时间，则自动设置完成时间
    if (updateData.status === 'completed' && !updateData.completed_at && existingData.status !== 'completed') {
      updateData.completed_at = new Date().toISOString();
    }
    
    updateData.updated_at = new Date().toISOString();
    
    return updateData;
  }
}
