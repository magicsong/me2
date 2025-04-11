import { NextRequest, NextResponse } from 'next/server';
import { TodoApiHandler } from './handler';
import { TodoBO } from './types';
import { getCurrentUserId } from '@/lib/utils';

// 创建 TodoApiHandler 实例
const todoHandler = TodoApiHandler.create();

// GET 处理程序 - 获取所有待办事项或特定 ID 的待办事项
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');
    const date = searchParams.get('date');
    
    // 如果提供了 ID，获取特定的待办事项
    if (id) {
      const todo = await todoHandler.getById(id);
      
      if (!todo) {
        return NextResponse.json({ success: false, error: '待办事项未找到' }, { status: 404 });
      }
      
      // 检查待办事项是否属于当前用户
      if ((todo as TodoBO).userId !== userId) {
        return NextResponse.json({ success: false, error: '无权访问此待办事项' }, { status: 403 });
      }
      
      return NextResponse.json({ success: true, data: todo });
    }
    
    // 如果提供了日期参数，获取该日期的待办事项
    if (date) {
      const handler = todoHandler as TodoApiHandler;
      const todos = await handler.getTodosByDate(date, userId);
      return NextResponse.json({ success: true, data: todos });
    }
    
    // 默认获取用户的所有待办事项
    const todos = await todoHandler.getAll(userId);
    return NextResponse.json({ success: true, data: todos });
  } catch (error) {
    console.error('获取待办事项失败:', error);
    return NextResponse.json(
      { success: false, error: '获取待办事项时出错' },
      { status: 500 }
    );
  }
}

// POST 处理程序 - 创建新的待办事项
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    const { data, autoGenerate, userPrompt } = await req.json();
    
    // 确保待办事项关联到当前用户
    if (data) {
      if (Array.isArray(data)) {
        data.forEach(item => {
          item.userId = userId;
        });
      } else {
        data.userId = userId;
      }
    }
    
    const result = await todoHandler.handleCreate({
      data,
      autoGenerate,
      userPrompt
    });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || '创建待办事项失败' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('创建待办事项失败:', error);
    return NextResponse.json(
      { success: false, error: '创建待办事项时出错' },
      { status: 500 }
    );
  }
}

// PUT 处理程序 - 更新待办事项
export async function PUT(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    const { data, autoGenerate, userPrompt } = await req.json();
    
    // 验证待办事项是否属于当前用户
    if (data) {
      if (Array.isArray(data)) {
        for (const item of data) {
          if (!item.id) continue;
          
          const todo = await todoHandler.getById(String(item.id));
          if (!todo || (todo as TodoBO).userId !== userId) {
            return NextResponse.json(
              { success: false, error: '无权更新此待办事项' },
              { status: 403 }
            );
          }
        }
      } else if (data.id) {
        const todo = await todoHandler.getById(String(data.id));
        if (!todo || (todo as TodoBO).userId !== userId) {
          return NextResponse.json(
            { success: false, error: '无权更新此待办事项' },
            { status: 403 }
          );
        }
      }
    }
    
    const result = await todoHandler.handleUpdate({
      data,
      autoGenerate,
      userPrompt
    });
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || '更新待办事项失败' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('更新待办事项失败:', error);
    return NextResponse.json(
      { success: false, error: '更新待办事项时出错' },
      { status: 500 }
    );
  }
}

// DELETE 处理程序 - 删除待办事项
export async function DELETE(req: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '必须提供待办事项 ID' },
        { status: 400 }
      );
    }
    
    // 验证待办事项是否属于当前用户
    const todo = await todoHandler.getById(id);
    if (!todo) {
      return NextResponse.json(
        { success: false, error: '待办事项未找到' },
        { status: 404 }
      );
    }
    
    if ((todo as TodoBO).userId !== userId) {
      return NextResponse.json(
        { success: false, error: '无权删除此待办事项' },
        { status: 403 }
      );
    }
    
    // 删除待办事项
    await (todoHandler as any).persistenceService.delete(id);
    
    return NextResponse.json({ success: true, message: '待办事项已删除' });
  } catch (error) {
    console.error('删除待办事项失败:', error);
    return NextResponse.json(
      { success: false, error: '删除待办事项时出错' },
      { status: 500 }
    );
  }
}
