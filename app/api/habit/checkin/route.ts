import { NextRequest, NextResponse } from 'next/server';
import { HabitEntryService } from '@/lib/persist/habit-entry';
import { HabitPersistenceService } from '@/lib/persist/habit';
import { revalidatePath } from 'next/cache';
import { getCurrentUserId } from '@/lib/utils';

// 创建打卡记录
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { habitId, tierId, comment } = await request.json();
    
    if (!habitId) {
      return NextResponse.json(
        { success: false, error: '缺少习惯ID' }, 
        { status: 400 }
      );
    }
    
    const habitEntryService = new HabitEntryService();
    const habitService = new HabitPersistenceService();
    
    // 验证习惯是否存在并属于当前用户
    const habit = await habitService.get(habitId);
    if (!habit || habit.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: '习惯不存在或不属于当前用户' }, 
        { status: 404 }
      );
    }
    
    // 创建打卡记录
    const entry = await habitEntryService.create({
      habit_id: Number(habitId),
      user_id: userId,
      completed_at: new Date().toISOString(),
      tier_id: tierId ? Number(tierId) : undefined,
      comment: comment,
    });

    // 获取更新后的统计信息
    const stats = await habitEntryService.getCheckInStats(Number(habitId), userId);
    
    revalidatePath('/habits');
    
    return NextResponse.json({ 
      success: true, 
      data: entry,
      stats: stats
    });
  } catch (error: any) {
    console.error('打卡失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '打卡失败' },
      { status: 500 }
    );
  }
}

// 获取打卡记录
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const habitId = searchParams.get('habitId');
    const action = searchParams.get('action');
    
    const habitEntryService = new HabitEntryService();
    
    if (action === 'stats' && habitId) {
      // 获取统计信息
      const stats = await habitEntryService.getCheckInStats(Number(habitId), userId);
      return NextResponse.json({ success: true, data: stats });
    } else if (action === 'today') {
      // 获取今天的打卡记录
      const entries = await habitEntryService.getTodayEntries(userId);
      return NextResponse.json({ success: true, data: entries });
    } else if (habitId) {
      // 获取特定习惯的所有打卡记录
      const entries = await habitEntryService.getEntriesByHabitId(Number(habitId), userId);
      return NextResponse.json({ success: true, data: entries });
    } else {
      // 获取所有打卡记录
      const entries = await habitEntryService.getAll(userId);
      return NextResponse.json({ success: true, data: entries });
    }
  } catch (error: any) {
    console.error('获取打卡记录失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取打卡记录失败' },
      { status: 500 }
    );
  }
}

// 删除打卡记录
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const habitId = searchParams.get('habitId');
    const entryId = searchParams.get('entryId');
    
    if (!habitId && !entryId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' }, 
        { status: 400 }
      );
    }
    
    const habitEntryService = new HabitEntryService();
    
    if (entryId) {
      // 删除特定打卡记录
      await habitEntryService.delete(entryId);
    } else if (habitId) {
      // 取消今天的打卡
      await habitEntryService.cancelTodayCheckIn(Number(habitId), userId);
    }
    
    revalidatePath('/habits');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除打卡记录失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '删除打卡记录失败' },
      { status: 500 }
    );
  }
}
