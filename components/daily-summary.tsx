'use client'

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Star, 
  Calendar, 
  Smile, 
  Dumbbell, 
  Moon, 
  Target,
  MessageCircle
} from "lucide-react";

export function DailySummary() {
  const [activeTab, setActiveTab] = useState("today");
  const dates = ["today", "yesterday", "2023-05-18", "2023-05-17"];
  
  // 示例数据
  const completedTasks = 8;
  const uncompletedTasks = 2;
  const completionRate = ((completedTasks / (completedTasks + uncompletedTasks)) * 100).toFixed(0);
  const goodThings = ["完成了重要任务", "帮助了同事解决问题", "学习了新的技术知识"];
  const challenges = "时间管理不够好，工作被频繁打断";
  const reflection = "如果能重来，我会更专注于优先事项，减少任务切换次数。";
  const mood = "😊 高";
  const energy = "🏋️ 中";
  const sleepQuality = "💤 好";
  const tomorrowGoals = ["完成项目报告初稿", "锻炼身体30分钟", "阅读技术书籍30分钟"];

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            每日总结
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList className="mb-2">
              {dates.map((date) => (
                <TabsTrigger key={date} value={date} className="text-xs py-1">
                  {date === "today" ? "今天" : date === "yesterday" ? "昨天" : date}
                </TabsTrigger>
              ))}
            </TabsList>
            <Badge variant="outline" className="ml-2 text-xs">
              AI总结可用
            </Badge>
          </div>
          
          <ScrollArea className="h-[400px] pr-4">
            <TabsContent value="today" className="mt-0">
              {/* 任务完成情况 */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold flex items-center mb-2">
                  <TrendingUp className="h-4 w-4 mr-1 text-primary" />
                  任务完成情况
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 p-2 rounded-md">
                    <div className="flex items-center justify-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-bold">{completedTasks}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">已完成</p>
                  </div>
                  <div className="bg-red-50 p-2 rounded-md">
                    <div className="flex items-center justify-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span className="font-bold">{uncompletedTasks}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">未完成</p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-md">
                    <div className="flex items-center justify-center gap-1 text-blue-600">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-bold">{completionRate}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">完成率</p>
                  </div>
                </div>
              </div>

              <Separator className="my-3" />

              {/* 三件好事 */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold flex items-center mb-2">
                  <Star className="h-4 w-4 mr-1 text-yellow-500" />
                  三件好事
                </h3>
                <ul className="space-y-2">
                  {goodThings.map((thing, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="min-w-5 pt-0.5">
                        <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0">
                          {index + 1}
                        </Badge>
                      </div>
                      <span>{thing}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Separator className="my-3" />

              {/* 今日反思 */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold flex items-center mb-2">
                  <MessageCircle className="h-4 w-4 mr-1 text-purple-500" />
                  今日反思
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="flex gap-2">
                    <span className="text-muted-foreground min-w-28">今天遇到的挑战：</span>
                    <span className="flex-1">{challenges}</span>
                  </p>
                  <p className="flex gap-2">
                    <span className="text-muted-foreground min-w-28">如果能重来一次：</span>
                    <span className="flex-1">{reflection}</span>
                  </p>
                </div>
              </div>

              <Separator className="my-3" />

              {/* 情绪 & 状态 */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold flex items-center mb-2">
                  <Smile className="h-4 w-4 mr-1 text-amber-500" />
                  情绪 & 状态
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 p-2 rounded-md">
                    <div className="flex items-center justify-center gap-1 text-amber-600">
                      <Smile className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium mt-1">{mood}</p>
                    <p className="text-xs text-muted-foreground">整体状态</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-md">
                    <div className="flex items-center justify-center gap-1 text-amber-600">
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium mt-1">{energy}</p>
                    <p className="text-xs text-muted-foreground">精力管理</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-md">
                    <div className="flex items-center justify-center gap-1 text-amber-600">
                      <Moon className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium mt-1">{sleepQuality}</p>
                    <p className="text-xs text-muted-foreground">睡眠质量</p>
                  </div>
                </div>
              </div>

              <Separator className="my-3" />

              {/* 明日展望 */}
              <div>
                <h3 className="text-sm font-semibold flex items-center mb-2">
                  <Target className="h-4 w-4 mr-1 text-blue-500" />
                  明日展望
                </h3>
                <ul className="space-y-2">
                  {tomorrowGoals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="min-w-5 pt-0.5">
                        <Badge className="h-5 w-5 flex items-center justify-center p-0 bg-blue-100 text-blue-800 hover:bg-blue-100">
                          {index + 1}
                        </Badge>
                      </div>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
            
            {/* 其他日期的内容可以类似实现 */}
            {dates.filter(date => date !== "today").map((date) => (
              <TabsContent key={date} value={date} className="mt-0">
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  查看 {date === "yesterday" ? "昨天" : date} 的总结
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
