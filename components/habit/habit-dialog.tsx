"use client"

import { useState, useEffect } from "react"
import { Habit } from "@/types/habit"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { CategoryIcon, categoryNames } from "./category-icon"

interface HabitDialogProps {
  open: boolean
  habit: Habit | null
  onClose: () => void
  onSave: (habit: Habit) => void
}

const habitSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "必须输入习惯名称"),
  description: z.string().optional(),
  category: z.enum(["health", "productivity", "mindfulness", "learning", "social"], {
    required_error: "请选择习惯类别",
  }),
  frequency: z.enum(["daily", "weekly", "monthly"]).default("daily"),
  rewardPoints: z.number().int().min(1, "奖励点数必须大于0").default(1),
})

export function HabitDialog({ open, habit, onClose, onSave }: HabitDialogProps) {
  const form = useForm<z.infer<typeof habitSchema>>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "health",
      frequency: "daily",
      rewardPoints: 1,
    },
  })

  useEffect(() => {
    if (habit) {
      form.reset({
        id: habit.id,
        name: habit.name,
        description: habit.description || "",
        category: habit.category,
        frequency: habit.frequency || "daily",
        rewardPoints: habit.rewardPoints || 1,
      })
    } else {
      form.reset({
        name: "",
        description: "",
        category: "health",
        frequency: "daily",
        rewardPoints: 1,
      })
    }
  }, [habit, form])

  const onSubmit = (values: z.infer<typeof habitSchema>) => {
    onSave({
      ...values,
      id: values.id || "",
      userId: habit?.userId || "",
      createdAt: habit?.createdAt || new Date().toISOString(),
      status: habit?.status || "active",
      checkIns: habit?.checkIns || {},
    })
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{habit ? "编辑习惯" : "创建新习惯"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>名称</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：每天阅读30分钟" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述（可选）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="添加更多细节关于这个习惯..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>类别</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="health">
                          <div className="flex items-center gap-2">
                            <CategoryIcon category="health" />
                            <span>健康</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="productivity">
                          <div className="flex items-center gap-2">
                            <CategoryIcon category="productivity" />
                            <span>效率</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="mindfulness">
                          <div className="flex items-center gap-2">
                            <CategoryIcon category="mindfulness" />
                            <span>心灵</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="learning">
                          <div className="flex items-center gap-2">
                            <CategoryIcon category="learning" />
                            <span>学习</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="social">
                          <div className="flex items-center gap-2">
                            <CategoryIcon category="social" />
                            <span>社交</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>频率</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="daily">每日</SelectItem>
                        <SelectItem value="weekly">每周</SelectItem>
                        <SelectItem value="monthly">每月</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="rewardPoints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>奖励点数</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="1"
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                    />
                  </FormControl>
                  <FormDescription>
                    完成此习惯可获得的奖励点数
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">{habit ? "保存" : "创建"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
