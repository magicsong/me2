import { tags, todo_tag_relations, todos } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { BaseRepository } from '../db';

// Todo数据类型定义
export type TodoData = typeof todos.$inferSelect & {
  tags?: Array<{
    id: number;
    name: string;
    color: string;
  }>;
};

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
export class TodoPersistenceService extends BaseRepository<typeof todos, TodoData> {
  constructor(connectionString?: string) {
    super(todos);

    // 设置钩子，在查询后自动加载关联的标签
    this.setHooks({
      afterQuery: async (data) => {
        if (!data) return data;

        // 处理单个 Todo 对象
        if (!Array.isArray(data)) {
          return this.loadTagsForSingleTodo(data);
        }

        // 处理 Todo 数组
        return this.loadTagsForMultipleTodos(data);
      }
    });
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
   * 获取 Todo 及其标签
   */
  async getTodoWithTags(todoId: number): Promise<TodoWithTags | null> {
    // 获取Todo项
    const todoItem = await this.findById(todoId);

    if (!todoItem) return null;

    // 获取关联的标签
    const tagList = await this.getTagsForTodo(todoId);

    return {
      todo: todoItem,
      tags: tagList
    };
  }

  /**
   * 为单个 Todo 加载标签
   */
  private async loadTagsForSingleTodo(todo: TodoData): Promise<TodoData> {
    todo.tags = await this.getTagsForTodo(todo.id);
    return todo;
  }

  /**
   * 为多个 Todo 批量加载标签
   */
  private async loadTagsForMultipleTodos(todos: TodoData[]): Promise<TodoData[]> {
    if (todos.length === 0) return todos;

    // 提取所有 todo IDs
    const todoIds = todos.map(todo => todo.id);

    // 批量获取所有关联的标签关系和标签数据
    const allTodoTags = await this.db
      .select({
        todo_id: todo_tag_relations.todo_id,
        tag_id: tags.id,
        name: tags.name,
        color: tags.color
      })
      .from(todo_tag_relations)
      .where(inArray(todo_tag_relations.todo_id, todoIds))
      .innerJoin(
        tags,
        eq(todo_tag_relations.tag_id, tags.id)
      );

    // 为每个 todo 分配其对应的标签
    return todos.map(todo => ({
      ...todo,
      tags: allTodoTags
        .filter(relation => relation.todo_id === todo.id)
        .map(tag => ({
          id: tag.tag_id,
          name: tag.name,
          color: tag.color
        }))
    }));
  }

  /**
   * 获取单个 Todo 的标签
   */
  private async getTagsForTodo(todoId: number): Promise<Array<{ id: number; name: string; color: string; }>> {
    return this.db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color
      })
      .from(todo_tag_relations)
      .where(eq(todo_tag_relations.todo_id, todoId))
      .innerJoin(
        tags,
        eq(todo_tag_relations.tag_id, tags.id)
      );
  }

  // 为了兼容旧接口，添加getById方法
  async getById(id: string | number): Promise<TodoData | null> {
    return this.findById(id);
  }
}
