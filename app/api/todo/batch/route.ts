import { NextRequest, NextResponse } from 'next/server';
import { TodoApiHandler } from '../handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BatchTodoRequest, TodoBO } from '../types';

// 创建 TodoApiHandler 实例
const todoHandler = TodoApiHandler.create() as TodoApiHandler;

// PUT 处理程序 - 批量更新待办事项
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { todos } = await req.json() as BatchTodoRequest;
    
    if (!todos || !Array.isArray(todos) || todos.length === 0) {
      return NextResponse.json(
        { success: false, error: '必须提供待办事项数组' },
        { status: 400 }
      );
    }
    
    // 验证所有待办事项是否属于当前用户
    for (const todo of todos) {
      if (!todo.id) continue;
      
      const existingTodo = await todoHandler.getById(String(todo.id));
      if (!existingTodo || (existingTodo as TodoBO).userId !== userId) {
        return NextResponse.json(
          { success: false, error: `无权更新 ID 为 ${todo.id} 的待办事项` },
          { status: 403 }
        );
      }
    }
    
    // 批量更新待办事项
    const updatedTodos = await todoHandler.batchUpdateTodos(todos);
    
    return NextResponse.json({
      success: true,
      data: updatedTodos,
      message: `已成功更新 ${updatedTodos.length} 个待办事项`
    });
  } catch (error) {
    console.error('批量更新待办事项失败:', error);
    return NextResponse.json(
      { success: false, error: '批量更新待办事项时出错' },
      { status: 500 }
    );
  }
}
