import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodoPriority } from "@/components/daily-start/todo-priority";
import { TodoItem } from "@/components/daily-start/todo-item";
import { DailyPlanningSteps } from "@/components/daily-start/daily-planning-steps";
import {
  SunIcon,
  ClockIcon,
  CalendarIcon,
  CheckIcon,
  XIcon
} from "lucide-react";
import { toast } from "sonner";
import { TodoBO } from "@/app/api/todo/types";

interface DailyPlanningProps {
  todos: TodoBO[];
  yesterdayTodos: TodoBO[];
  onUpdateTodo: (todo: Todo) => Promise<boolean>;
  onBatchUpdateTodos: (todos: Todo[]) => Promise<boolean>;
  onChangeTab: () => void;
}

export function DailyPlanning({
  todos,
  yesterdayTodos,
  onUpdateTodo,
  onBatchUpdateTodos,
  onChangeTab
}: DailyPlanningProps) {
  const [selectedTodos, setSelectedTodos] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("yesterday");

  // 过滤未完成的昨日任务
  const incompleteTodos = yesterdayTodos.filter(
    (todo) => todo.status !== "completed"
  );

  // 获取今日任务的分类统计
  let todayStats = {}
  if (todos.length > 0) {
    todayStats = {
      total: todos.length,
      completed: todos.filter((todo) => todo.status === "completed").length,
      urgent: todos.filter((todo) => todo.priority === "urgent").length,
      important: todos.filter((todo) => todo.priority === "high").length,
      normal: todos.filter((todo) => todo.priority === "medium").length,
      low: todos.filter((todo) => todo.priority === "low").length
    };
  }


  function handleSelectTodo(todoId: number, selected: boolean) {
    if (selected) {
      setSelectedTodos([...selectedTodos, todoId]);
    } else {
      setSelectedTodos(selectedTodos.filter(id => id !== todoId));
    }
  }

  function handleSelectAll() {
    if (activeTab === "yesterday") {
      if (selectedTodos.length === incompleteTodos.length) {
        setSelectedTodos([]);
      } else {
        setSelectedTodos(incompleteTodos.map(({ todo }) => todo.id));
      }
    } else {
      if (selectedTodos.length === todos.length) {
        setSelectedTodos([]);
      } else {
        setSelectedTodos(todos.map(({ todo }) => todo.id));
      }
    }
  }

  async function handleBatchMoveTodayWithPriority(priority: string) {
    if (selectedTodos.length === 0) {
      toast.error("请先选择任务");
      return;
    }

    // 获取所有选中的待办事项
    const todosToUpdate = incompleteTodos
      .filter(({ todo }) => selectedTodos.includes(todo.id))
      .map(({ todo }) => ({
        ...todo,
        planned_date: new Date().toISOString().split('T')[0], // 设置为今天
        priority: priority
      }));

    const success = await onBatchUpdateTodos(todosToUpdate);
    if (success) {
      setActiveTab("today");
      setSelectedTodos([]);
    }
  }

  async function handleBatchSetPriority(priority: string) {
    if (selectedTodos.length === 0) {
      toast.error("请先选择任务");
      return;
    }

    // 获取所有选中的待办事项
    const todosToUpdate = todos
      .filter(({ todo }) => selectedTodos.includes(todo.id))
      .map(({ todo }) => ({
        ...todo,
        priority: priority
      }));

    const success = await onBatchUpdateTodos(todosToUpdate);
    if (success) {
      setSelectedTodos([]);
    }
  }

  async function handleBatchComplete() {
    if (selectedTodos.length === 0) {
      toast.error("请先选择任务");
      return;
    }

    // 获取所有选中的待办事项
    const todosToUpdate = todos
      .filter(({ todo }) => selectedTodos.includes(todo.id))
      .map(({ todo }) => ({
        ...todo,
        status: "completed",
        completed_at: new Date().toISOString()
      }));

    const success = await onBatchUpdateTodos(todosToUpdate);
    if (success) {
      setSelectedTodos([]);
    }
  }

  async function handleSaveDailyIntention() {
    try {
      // 这里可以接入API保存日常意图
      localStorage.setItem("dailyIntention", dailyIntention);
      toast.success("保存成功");
    } catch (error) {
      toast.error("保存失败");
    }
  }

  function handleStartFocusing() {
    // 进入时间轴视图
    onChangeTab();
  }

  return (
    <div className="space-y-6">
      {/* 每日规划步骤组件 */}
      <DailyPlanningSteps onStartFocusing={handleStartFocusing} />

      {/* 待办事项管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-blue-500" />
            任务管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="yesterday">
                <CalendarIcon className="mr-2 h-4 w-4" />
                昨日任务 ({incompleteTodos.length})
              </TabsTrigger>
              <TabsTrigger value="today">
                <SunIcon className="mr-2 h-4 w-4" />
                今日任务 ({todos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="yesterday" className="space-y-4">
              {incompleteTodos.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedTodos.length === incompleteTodos.length ? "取消全选" : "全选"}
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchMoveTodayWithPriority("urgent")}
                        className="flex items-center gap-1"
                      >
                        <TodoPriority priority="urgent" showLabel={false} />
                        移至今日
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchMoveTodayWithPriority("high")}
                        className="flex items-center gap-1"
                      >
                        <TodoPriority priority="high" showLabel={false} />
                        移至今日
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchMoveTodayWithPriority("medium")}
                        className="flex items-center gap-1"
                      >
                        <TodoPriority priority="medium" showLabel={false} />
                        移至今日
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {incompleteTodos.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        tags={todo.tags}
                        selected={selectedTodos.includes(todo.id)}
                        onSelect={(selected) => handleSelectTodo(todo.id, selected)}
                        onUpdate={onUpdateTodo}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckIcon className="mx-auto h-12 w-12 mb-4 text-green-500" />
                  <p className="text-lg">太好了！昨天的任务全部完成了。</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="today" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                <Card className="bg-secondary/20">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">总计</p>
                    <p className="text-2xl font-bold">{todayStats.total}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/10">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">已完成</p>
                    <p className="text-2xl font-bold">{todayStats.completed}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/10">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">紧急</p>
                    <p className="text-2xl font-bold">{todayStats.urgent}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-500/10">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">重要</p>
                    <p className="text-2xl font-bold">{todayStats.important}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">普通</p>
                    <p className="text-2xl font-bold">{todayStats.normal + todayStats.low}</p>
                  </CardContent>
                </Card>
              </div>

              {todos.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedTodos.length === todos.length ? "取消全选" : "全选"}
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchSetPriority("urgent")}
                        className="flex items-center gap-1"
                      >
                        <TodoPriority priority="urgent" showLabel={false} />
                        标记
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchSetPriority("high")}
                        className="flex items-center gap-1"
                      >
                        <TodoPriority priority="high" showLabel={false} />
                        标记
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchSetPriority("medium")}
                        className="flex items-center gap-1"
                      >
                        <TodoPriority priority="medium" showLabel={false} />
                        标记
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleBatchComplete}
                        className="flex items-center gap-1"
                      >
                        <CheckIcon className="h-3 w-3" />
                        完成
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {todos.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        tags={todo.tags}
                        selected={selectedTodos.includes(todo.id)}
                        onSelect={(selected) => handleSelectTodo(todo.id, selected)}
                        onUpdate={onUpdateTodo}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <XIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-lg">还没有今天的任务，从昨天的任务添加一些吧！</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
