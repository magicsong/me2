"use client"

import { useEffect, useState } from "react"
import { Habit } from "@/types/habit"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, PieChart } from "@/components/ui/charts"

interface HabitStatisticsProps {
  habits: Habit[]
}

export function HabitStatistics({ habits }: HabitStatisticsProps) {
  const [mounted, setMounted] = useState(false)
  
  // 解决水合问题，避免客户端/服务器不匹配
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Card className="h-[300px]">
        <CardHeader>
          <CardTitle>习惯统计</CardTitle>
          <CardDescription>您的习惯完成情况统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-sm text-muted-foreground">加载统计数据...</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  // 计算统计数据
  const statusData = [
    { name: "进行中", value: habits.filter(h => h.status === "active").length },
    { name: "已完成", value: habits.filter(h => h.status === "completed").length }
  ]
  
  // 模拟每周完成情况
  const weeklyData = [
    { name: "周一", completed: 4 },
    { name: "周二", completed: 2 },
    { name: "周三", completed: 5 },
    { name: "周四", completed: 3 },
    { name: "周五", completed: 6 },
    { name: "周六", completed: 4 },
    { name: "周日", completed: 3 }
  ]
  
  return (
    <Card className="h-[300px]">
      <CardHeader>
        <CardTitle>习惯统计</CardTitle>
        <CardDescription>您的习惯完成情况统计</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="status">
          <TabsList className="mb-4">
            <TabsTrigger value="status">状态分布</TabsTrigger>
            <TabsTrigger value="weekly">每周完成</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="h-[200px]">
            {statusData.some(d => d.value > 0) ? (
              <PieChart 
                data={statusData} 
                index="name"
                categories={["value"]}
                valueFormatter={(value) => `${value}个`}
                colors={["blue", "green"]}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">暂无数据</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="weekly" className="h-[200px]">
            <BarChart 
              data={weeklyData}
              index="name"
              categories={["completed"]}
              valueFormatter={(value) => `${value}个`}
              colors={["blue"]}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
