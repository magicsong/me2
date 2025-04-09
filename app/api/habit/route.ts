import { NextRequest, NextResponse } from 'next/server';
import { createHabitApiHandler } from './service';
import { getCurrentUserId } from '@/lib/utils';

// 创建习惯处理器的实例
const habitHandler = createHabitApiHandler();

/**
 * 创建新习惯
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    const body = await request.json();

    // 如果请求体中没有用户ID，则使用当前用户ID
    if (body.data && !body.data.user_id) {
      body.data.user_id = userId;
    } else if (Array.isArray(body.data)) {
      // 处理数组情况
      body.data = body.data.map((item: any) => ({
        ...item,
        user_id: item.user_id || userId
      }));
    }

    const result = await habitHandler.handleCreate(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('创建习惯时出错:', error);
    return NextResponse.json(
      { success: false, error: '处理请求时发生错误' },
      { status: 500 }
    );
  }
}

/**
 * 更新习惯
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const body = await request.json();

    body.user_id = userId;

    const result = await habitHandler.handleUpdate(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('更新习惯时出错:', error);
    return NextResponse.json(
      { success: false, error: '处理请求时发生错误' },
      { status: 500 }
    );
  }
}

/**
 * 获取习惯（通过ID或获取用户的所有习惯）
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const habitId = searchParams.get('id');

    const habitApiHandler = createHabitApiHandler();

    if (habitId) {
      // 获取单个习惯
      const habit = await habitApiHandler.getById(habitId);
      return NextResponse.json({ success: true, data: habit });
    } else {
      // 获取所有习惯，包含今日打卡状态
      const persistenceService = habitApiHandler.getPersistenceService();
      const habits = await persistenceService.getAllWithTodayCheckIns(userId);

      // 转换为业务对象
      const habitBOs = habitApiHandler.toBusinessObjects(habits);

      return NextResponse.json({ success: true, data: habitBOs });
    }
  } catch (error) {
    console.error('获取习惯出错:', error);
    return NextResponse.json({ success: false, error: '获取习惯失败' }, { status: 500 });
  }
}

/**
 * 删除习惯
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少习惯ID' }, { status: 400 });
    }

    const persistenceService = habitHandler.getPersistenceService();
    await persistenceService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除习惯时出错:', error);
    return NextResponse.json(
      { success: false, error: '处理请求时发生错误' },
      { status: 500 }
    );
  }
}
