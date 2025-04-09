import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Habit } from "@/types/habit";
import { format, isSameDay } from "date-fns";
import { CheckCircle, Check, X } from "lucide-react";

interface CheckInHistoryProps {
  habit: Habit;
}

interface CheckInStats {
  totalCheckIns: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  checkInsByDate: Record<string, any[]>;
}

export function CheckInHistory({ habit }: CheckInHistoryProps) {
  const [stats, setStats] = useState<CheckInStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [dayEntries, setDayEntries] = useState<any[]>([]);

  useEffect(() => {
    if (habit) {
      fetchCheckInStats();
    }
  }, [habit]);

  useEffect(() => {
    if (stats && selectedDay) {
      const dateStr = format(selectedDay, 'yyyy-MM-dd');
      setDayEntries(stats.checkInsByDate[dateStr] || []);
    } else {
      setDayEntries([]);
    }
  }, [selectedDay, stats]);

  async function fetchCheckInStats() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/habit/checkin?habitId=${habit.id}&action=stats`);
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        console.error('获取打卡统计失败:', result.error);
      }
    } catch (error) {
      console.error('获取打卡统计出错:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function dayHasCheckIn(day: Date): boolean {
    if (!stats) return false;
    const dateStr = format(day, 'yyyy-MM-dd');
    return !!stats.checkInsByDate[dateStr];
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>打卡记录</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <div className="flex justify-center gap-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center justify-center p-3 border rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">当前连续</span>
                <span className="text-2xl font-bold">{stats.currentStreak}天</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 border rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">最长连续</span>
                <span className="text-2xl font-bold">{stats.longestStreak}天</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 border rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">总打卡次数</span>
                <span className="text-2xl font-bold">{stats.totalCheckIns}次</span>
              </div>
              <div className="flex flex-col items-center justify-center p-3 border rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">30天完成率</span>
                <span className="text-2xl font-bold">{Math.round(stats.completionRate)}%</span>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={setSelectedDay}
                modifiers={{
                  checked: (date) => dayHasCheckIn(date),
                }}
                modifiersClassNames={{
                  checked: "bg-green-100 text-green-700 font-bold",
                }}
                className="mx-auto"
              />
            </div>

            {dayEntries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-medium">
                  {format(selectedDay!, 'yyyy年MM月dd日')}打卡详情
                </h3>
                {dayEntries.map((entry, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-sm">
                        {format(new Date(entry.completed_at), 'HH:mm')}
                      </span>
                      {entry.tier_name && (
                        <Badge variant="outline" className="ml-auto">
                          Lv.{entry.tier_level} {entry.tier_name}
                        </Badge>
                      )}
                    </div>
                    {entry.comment && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {entry.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            还没有打卡记录，开始你的第一次打卡吧！
          </div>
        )}
      </CardContent>
    </Card>
  );
}
