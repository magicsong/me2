"use client"

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  Edit, 
  Trash2, 
  CheckCircle, 
  ArrowRight, 
  Flame, 
  CalendarClock, 
  Trophy, 
  AlignLeft, 
  Clock, 
  Calendar, 
  CalendarDays, 
  Repeat 
} from "lucide-react";
import type { Habit } from "@/types/habit";
import { CategoryIcon, categoryNames } from "./category-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckInDialog } from "./check-in-dialog";

interface HabitListProps {
  habits: Habit[];
  isLoading: boolean;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onCheckIn?: (habit: Habit, date: string) => Promise<void>;
  onCancelCheckIn?: (habit: Habit, date: string) => Promise<void>;
}

export function HabitList({ 
  habits, 
  isLoading, 
  onEdit, 
  onDelete,
  onCheckIn,
  onCancelCheckIn
}: HabitListProps) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmCancelCheckIn, setConfirmCancelCheckIn] = useState<Habit | null>(null);
  const [checkInHabit, setCheckInHabit] = useState<Habit | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  const handleDeleteClick = (id: string) => {
    setConfirmDelete(id);
  };

  const handleConfirmDelete = () => {
    if (confirmDelete) {
      onDelete(confirmDelete);
      setConfirmDelete(null);
    }
  };

  // 使用 todayCheckedIn 代替自定义检查
  function isCheckedIn(habit: Habit) {
    return habit.todayCheckedIn === true;
  }

  const handleCheckInToday = async (habit: Habit) => {
    setCheckInHabit(habit);
  };

  const handleCancelCheckInToday = async (habit: Habit) => {
    setConfirmCancelCheckIn(habit);
  };

  const handleConfirmCancelCheckIn = async () => {
    if (confirmCancelCheckIn && onCancelCheckIn) {
      await onCancelCheckIn(confirmCancelCheckIn, today);
      setConfirmCancelCheckIn(null);
    }
  };

  const handleCheckInSubmit = async (habitId: string, tierId?: number, comment?: string) => {
    if (checkInHabit && onCheckIn) {
      await onCheckIn(checkInHabit, today);
    }
  };

  const formatFrequency = (habit: Habit) => {
    if (!habit.frequency) return "";
    
    // 简单格式化频率展示
    const freq = habit.frequency;
    if (freq === "daily") return "每日";
    if (freq === "weekly") return "每周";
    if (freq.startsWith("weekly:")) {
      const days = freq.split(":")[1].split(",");
      const dayNames = {
        "1": "一", "2": "二", "3": "三", "4": "四", "5": "五", "6": "六", "0": "日"
      };
      return `每周${days.map(d => dayNames[d as keyof typeof dayNames]).join("、")}`;
    }
    if (freq === "monthly") return "每月";
    return freq;
  };

  // 获取频率对应的图标
  const getFrequencyIcon = (frequency?: string) => {
    if (!frequency) return <CalendarClock className="h-3.5 w-3.5" />;
    
    if (frequency === "daily") return <Clock className="h-3.5 w-3.5" />;
    if (frequency === "weekly" || frequency.startsWith("weekly:")) return <Calendar className="h-3.5 w-3.5" />;
    if (frequency === "monthly") return <CalendarDays className="h-3.5 w-3.5" />;
    
    return <Repeat className="h-3.5 w-3.5" />;
  };

  // 计算显示的streak值
  const getDisplayStreak = (habit: Habit) => {
    // 如果已打卡但streak为0，可能是API没有更新，显示为1
    if (habit.todayCheckedIn && (!habit.streak || habit.streak === 0)) {
      return 1;
    }
    return habit.streak || 0;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>我的习惯</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <Skeleton className="h-6 w-1/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (habits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>我的习惯</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            还没有添加习惯，点击"新建习惯"开始吧！
          </div>
        </CardContent>
      </Card>
    );
  }

  // 按类别分组习惯
  const habitsByCategory = habits.reduce((acc, habit) => {
    const category = habit.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(habit);
    return acc;
  }, {} as Record<string, Habit[]>);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>我的习惯</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(habitsByCategory).map(([category, categoryHabits]) => (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <CategoryIcon category={category as any} size={20} />
                  <h3>{categoryNames[category as keyof typeof categoryNames] || category}</h3>
                </div>
                
                <div className="space-y-3">
                  {categoryHabits.map(habit => (
                    <div key={habit.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{habit.name}</span>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Trophy className="h-3 w-3 text-amber-500" />
                            {habit.rewardPoints} 点
                          </Badge>
                          {getDisplayStreak(habit) > 0 && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Flame className="h-3 w-3 text-orange-500" />
                              连续 {getDisplayStreak(habit)} 天
                            </Badge>
                          )}
                        </div>
                        
                        {habit.description && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                            <AlignLeft className="h-3.5 w-3.5 text-muted-foreground/70" />
                            {habit.description}
                          </p>
                        )}
                        
                        {habit.frequency && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            {getFrequencyIcon(habit.frequency)}
                            <span>{formatFrequency(habit)}</span>
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isCheckedIn(habit) ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1 text-green-600" 
                            onClick={() => handleCancelCheckInToday(habit)}
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>已打卡</span>
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-1" 
                            onClick={() => handleCheckInToday(habit)}
                          >
                            <Check className="h-4 w-4" />
                            <span>打卡</span>
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                        >
                          <Link href={`/habits/${habit.id}`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(habit)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(habit.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这个习惯吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog 
        open={!!confirmCancelCheckIn} 
        onOpenChange={(open) => !open && setConfirmCancelCheckIn(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>取消打卡</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要取消今天的打卡记录吗？这可能会影响您的连续打卡记录。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>不取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCancelCheckIn}>确认取消</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CheckInDialog 
        open={!!checkInHabit} 
        habit={checkInHabit} 
        onClose={() => setCheckInHabit(null)} 
        onCheckIn={handleCheckInSubmit} 
      />
    </>
  );
}
