"use client"

import { useState, useEffect } from "react"
import { HabitList } from "@/components/habit/habit-list"
import { RewardsAchievements } from "@/components/habit/rewards-achievements"
import { HabitStatistics } from "@/components/habit/habit-statistics"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { HabitDialog } from "@/components/habit/habit-dialog"
import type { Habit } from "@/types/habit"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // 检查用户是否已登录
    if (status === "unauthenticated") {
      router.push("/login")
    } else if (status === "authenticated") {
      fetchHabits()
    }
  }, [status, router])

  async function fetchHabits() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/habit')
      const result = await response.json()
      
      if (result.success) {
        // 数据已经包含了今日打卡状态，无需额外请求
        setHabits(result.data)
      } else {
        console.error('获取习惯失败:', result.error)
        toast.error("获取习惯失败", {
          description: result.error
        })
      }
    } catch (error) {
      console.error('获取习惯出错:', error)
      toast.error("获取习惯出错", {
        description: "请稍后重试"
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleAddHabit() {
    setEditingHabit(null)
    setIsDialogOpen(true)
  }

  function handleEditHabit(habit: Habit) {
    setEditingHabit(habit)
    setIsDialogOpen(true)
  }

  async function handleDeleteHabit(id: string) {
    try {
      const response = await fetch(`/api/habit?id=${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      
      if (result.success) {
        setHabits(habits.filter(habit => habit.id !== id))
        toast.success("删除成功", {
          description: "习惯已成功删除"
        })
      } else {
        console.error('删除习惯失败:', result.error)
        toast.error("删除习惯失败", {
          description: result.error
        })
      }
    } catch (error) {
      console.error('删除习惯出错:', error)
      toast.error("删除出错", {
        description: "请稍后重试"
      })
    }
  }

  async function handleSaveHabit(habit: Habit) {
    const isUpdate = !!habit.id
    
    try {
      const response = await fetch('/api/habit', {
        method: isUpdate ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: habit 
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        if (isUpdate) {
          setHabits(habits.map(h => h.id === habit.id ? result.data : h))
        } else {
          setHabits([...habits, result.data])
        }
        setIsDialogOpen(false)
        toast.success(isUpdate ? "更新成功" : "创建成功", {
          description: `习惯"${habit.name}"已${isUpdate ? '更新' : '创建'}`
        })
      } else {
        console.error(isUpdate ? '更新习惯失败:' : '创建习惯失败:', result.error)
        toast.error(isUpdate ? "更新失败" : "创建失败", {
          description: result.error
        })
      }
    } catch (error) {
      console.error(isUpdate ? '更新习惯出错:' : '创建习惯出错:', error)
      toast.error(isUpdate ? "更新出错" : "创建出错", {
        description: "请稍后重试"
      })
    }
  }

  async function handleCheckIn(habit: Habit, date: string) {
    try {
      const response = await fetch('/api/habit/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId: habit.id, date }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 重新获取所有习惯，确保数据同步
        fetchHabits()
        toast.success("打卡成功", {
          description: `"${habit.name}"已完成打卡，获得${habit.rewardPoints || 1}点奖励！`
        })
      } else {
        toast.error("打卡失败", {
          description: result.error
        })
      }
    } catch (error) {
      console.error('打卡出错:', error)
      toast.error("打卡出错", {
        description: "请稍后重试"
      })
    }
  }

  async function handleCancelCheckIn(habit: Habit, date: string) {
    try {
      const response = await fetch(`/api/habit/checkin?habitId=${habit.id}&date=${date}`, {
        method: 'DELETE',
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 重新获取所有习惯，确保数据同步
        fetchHabits()
        toast.success("已取消打卡", {
          description: `"${habit.name}"的打卡记录已取消`
        })
      } else {
        toast.error("取消打卡失败", {
          description: result.error
        })
      }
    } catch (error) {
      console.error('取消打卡出错:', error)
      toast.error("取消打卡出错", {
        description: "请稍后重试"
      })
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">习惯管理</h1>
        <Button onClick={handleAddHabit} className="flex items-center gap-1">
          <PlusCircle className="h-4 w-4" />
          <span>新建习惯</span>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HabitList 
            habits={habits} 
            isLoading={isLoading}
            onEdit={handleEditHabit}
            onDelete={handleDeleteHabit}
            onCheckIn={handleCheckIn}
            onCancelCheckIn={handleCancelCheckIn}
          />
        </div>
        <div className="flex flex-col gap-4">
          <RewardsAchievements habits={habits} />
          <HabitStatistics habits={habits} />
        </div>
      </div>
      
      <HabitDialog 
        open={isDialogOpen}
        habit={editingHabit}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveHabit}
      />
    </div>
  )
}
