'use client'

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, TrendingUp, CalendarCheck } from "lucide-react";
import Link from "next/link";

export function HabitStats() {
  const habitsCompleted = 5; // 示例数据，可替换为动态数据
  const totalHabits = 8; // 示例数据，可替换为动态数据
  const completionRate = Math.round((habitsCompleted / totalHabits) * 100);

  const handleNavigate = () => {
    // 跳转到打卡页面的逻辑
    console.log("跳转到打卡页面");
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            习惯统计
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col items-center justify-center p-3 bg-primary/10 rounded-md">
            <div className="text-2xl font-bold text-primary flex items-center gap-1">
              <CheckCircle className="h-5 w-5" />
              {habitsCompleted}/{totalHabits}
            </div>
            <p className="text-xs text-muted-foreground mt-1">今日完成习惯</p>
          </div>
          <div className="flex flex-col items-center justify-center p-3 bg-primary/10 rounded-md">
            <div className="text-2xl font-bold text-primary flex items-center gap-1">
              <TrendingUp className="h-5 w-5" />
              {completionRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">完成率</p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-1">
        <Button 
          onClick={handleNavigate} 
          className="w-full"
          variant="outline"
        >
          <CalendarCheck className="mr-2 h-4 w-4" />
          去打卡页面
        </Button>
      </CardFooter>
    </Card>
  );
}
