// 此处仅为建议修改，需根据实际文件进行调整

// ...existing imports...

export async function POST(req: Request) {
  try {
    const { habitId, date } = await req.json();
    // ...existing validation code...

    // 查找习惯
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      include: { 
        checkIns: {
          orderBy: { date: 'desc' },
          take: 10
        }
      }
    });
    
    if (!habit) {
      return Response.json({ success: false, error: "习惯不存在" }, { status: 404 });
    }

    // 检查是否已打卡
    const existingCheckIn = await prisma.checkIn.findFirst({
      where: {
        habitId,
        date: new Date(date),
      }
    });

    if (existingCheckIn) {
      return Response.json({ success: false, error: "今天已打卡" }, { status: 400 });
    }

    // 计算连续打卡天数
    let newStreak = 1; // 默认至少为1
    
    // 查找最近一次打卡记录
    const latestCheckIn = habit.checkIns[0];
    
    if (latestCheckIn) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const latestDate = new Date(latestCheckIn.date);
      latestDate.setHours(0, 0, 0, 0);
      
      // 如果最后一次打卡是昨天，则累加streak
      if (latestDate.getTime() === yesterday.getTime()) {
        newStreak = (habit.streak || 0) + 1;
      }
    }

    // 创建打卡记录
    await prisma.checkIn.create({
      data: {
        habitId,
        date: new Date(date),
        // ...其他打卡数据...
      }
    });

    // 更新习惯的streak值
    await prisma.habit.update({
      where: { id: habitId },
      data: { streak: newStreak }
    });

    // ...成功响应...
    
  } catch (error) {
    console.error("打卡失败:", error);
    return Response.json({ success: false, error: "打卡失败" }, { status: 500 });
  }
}
