"use client"

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, CheckCircle, Edit, Calendar, Award } from "lucide-react";
import { HabitDialog } from "@/components/habit/habit-dialog";
import { CheckInDialog } from "@/components/habit/check-in-dialog";
import { CheckInHistory } from "@/components/habit/check-in-history";
import type { Habit } from "@/types/habit";
import { CategoryIcon, categoryNames } from "@/components/habit/category-icon";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

export default function HabitDetailPage() {
  const params = useParams();
  const habitId = typeof params.id === 'string' ? params.id : params.id?.[0] || '';
  const [habit, setHabit] = useState<Habit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCheckInDialogOpen, setIsCheckInDialogOpen] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchHabit();
      checkTodayStatus();
    }
  }, [status, habitId, router]);

  async function fetchHabit() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/habit?id=${habitId}`);
      const result = await response.json();
      
      if (result.success) {
        setHabit(result.data);
      } else {
        console.error('获取习惯失败:', result.error);
        toast.error("获取习惯失败", {
          description: result.error
        });
        router.push("/habits");
      }
    } catch (error) {
      console.error('获取习惯出错:', error);
      toast.error("获取习惯出错", {
        description: "请稍后重试"
      });
      router.push("/habits");
    } finally {
      setIsLoading(false);
    }
  }

  async function checkTodayStatus() {
    try {
      const response = await fetch(`/api/habit/checkin?action=today`);
      const result = await response.json();
      
      if (result.success) {
        const todayEntries = result.data;
        setHasCheckedInToday(todayEntries.some((entry: any) => entry.habit_id === Number(habitId)));
      }
    } catch (error) {
      console.error('检查今日打卡状态出错:', error);
    }
  }

  async function handleSaveHabit(updatedHabit: Habit) {
    try {
      const response = await fetch('/api/habit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: updatedHabit 
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setHabit(result.data);
        setIsEditDialogOpen(false);
        toast.success("更新成功", {
          description: `习惯"${updatedHabit.name}"已更新`
        });
      } else {
        console.error('更新习惯失败:', result.error);
        toast.error("更新失败", {
          description: result.error
        });
      }
    } catch (error) {
      console.error('更新习惯出错:', error);
      toast.error("更新出错", {
        description: "请稍后重试"
      });
    }
  }

  async function handleCheckIn(habitId: string, tierId?: number, comment?: string) {
    try {
      const response = await fetch('/api/habit/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          habitId, 
          tierId, 
          comment 
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setHasCheckedInToday(true);
        toast.success("打卡成功", {
          description: `"${habit?.name}"已完成打卡，获得${habit?.rewardPoints || 1}点奖励！`
        });
        // 重新加载打卡历史
        checkTodayStatus();
      } else {
        toast.error("打卡失败", {
          description: result.error
        });
      }
    } catch (error) {
      console.error('打卡出错:', error);
      toast.error("打卡出错", {
        description: "请稍后重试"
      });
    }
  }

  async function handleCancelCheckIn() {
    if (!habit) return;
    
    try {
      const response = await fetch(`/api/habit/checkin?habitId=${habit.id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        setHasCheckedInToday(false);
        toast.success("已取消打卡", {
          description: `"${habit.name}"的今日打卡记录已取消`
        });
        // 重新加载打卡历史
        checkTodayStatus();
      } else {
        toast.error("取消打卡失败", {
          description: result.error
        });
      }
    } catch (error) {
      console.error('取消打卡出错:', error);
      toast.error("取消打卡出错", {
        description: "请稍后重试"
      });
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/habits")}
          className="mr-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : habit ? (
        <>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {habit.category && <CategoryIcon category={habit.category} size={24} />}
                <h1 className="text-3xl font-bold">{habit.name}</h1>
                <Badge className="ml-2">{categoryNames[habit.category]}</Badge>
              </div>
              <p className="text-gray-500">
                创建于 {format(new Date(habit.createdAt), 'yyyy年MM月dd日')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={hasCheckedInToday ? "outline" : "default"}
                onClick={() => hasCheckedInToday ? handleCancelCheckIn() : setIsCheckInDialogOpen(true)}
                className="flex items-center gap-1"
              >
                {hasCheckedInToday ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    已打卡
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    打卡
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(true)}
                className="flex items-center gap-1"
              >
                <Edit className="h-4 w-4" />
                编辑
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      频率
                    </h3>
                    <p className="text-gray-600">
                      {habit.frequency === 'daily' && '每日'}
                      {habit.frequency === 'weekly' && '每周'}
                      {habit.frequency === 'monthly' && '每月'}
                      {habit.frequency === 'scenario' && '情景触发'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-1">
                      <Award className="h-4 w-4" />
                      奖励点数
                    </h3>
                    <p className="text-gray-600">每次完成可获得 {habit.rewardPoints} 点</p>
                  </div>

                  {habit.description && (
                    <div>
                      <h3 className="text-lg font-medium">描述</h3>
                      <p className="text-gray-600">{habit.description}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="md:col-span-2">
              <CheckInHistory habit={habit} />
            </div>
          </div>

          {isEditDialogOpen && (
            <HabitDialog
              open={isEditDialogOpen}
              habit={habit}
              onClose={() => setIsEditDialogOpen(false)}
              onSave={handleSaveHabit}
            />
          )}

          <CheckInDialog
            open={isCheckInDialogOpen}
            habit={habit}
            onClose={() => setIsCheckInDialogOpen(false)}
            onCheckIn={handleCheckIn}
          />
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          找不到该习惯，可能已被删除
        </div>
      )}
    </div>
  );
}
