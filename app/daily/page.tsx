"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyWelcome } from "@/components/daily-start/daily-welcome";
import { DailyPlanning } from "@/components/daily-start/daily-planning";
import { DailyTimelineView } from "@/components/daily-timeline-view";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TodoBO } from "../api/todo/types";

export default function DailyStartPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [todos, setTodos] = useState<TodoBO[]>([]);
  const [todosYesterday, setTodosYesterday] = useState<TodoBO[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [activeTab, setActiveTab] = useState("planning");
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchTodos();
      fetchYesterdayTodos();
      fetchPomodoroSessions();
    }
  }, [status, router, selectedDate]);

  // 检查是否已经显示过今天的欢迎页
  useEffect(() => {
    const today = new Date().toDateString();
    const lastWelcomeDate = localStorage.getItem("lastWelcomeDate");

    if (lastWelcomeDate === today) {
      setShowWelcome(true);
    }
  }, []);

  async function fetchTodos() {
    try {
      const response = await fetch(`/api/todo?date=${selectedDate.toISOString()}`);
      const result = await response.json();

      if (result.success) {
        console.log(result.data)
        setTodos(result.data as TodoBO[]);
      } else {
        console.error('获取待办事项失败:', result.error);
        toast.error("获取待办事项失败");
      }
    } catch (error) {
      console.error('获取待办事项出错:', error);
      toast.error("获取待办事项出错");
    }
  }

  async function fetchYesterdayTodos() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await fetch(`/api/todo?includePrevious=true&date=${yesterday.toISOString()}`);
      const result = await response.json();

      if (result.success) {
        setTodosYesterday(result.data);
      } else {
        console.error('获取昨日待办事项失败:', result.error);
      }
    } catch (error) {
      console.error('获取昨日待办事项出错:', error);
    }
  }

  async function fetchPomodoroSessions() {
    try {
      const response = await fetch(`/api/pomodoro?date=${selectedDate.toISOString()}`);
      const result = await response.json();

      if (result.success) {
        setPomodoroSessions(result.data);
      } else {
        console.error('获取番茄钟会话失败:', result.error);
      }
    } catch (error) {
      console.error('获取番茄钟会话出错:', error);
    }
  }

  async function handleUpdateTodo(todo: Todo) {
    try {
      const response = await fetch('/api/todo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: todo }),
      });

      const result = await response.json();

      if (result.success) {
        // 更新本地状态
        setTodos(prevTodos =>
          prevTodos.map(item =>
            item.todo.id === todo.id ? { ...item, todo: result.data } : item
          )
        );
        toast.success("更新成功");
        return true;
      } else {
        toast.error("更新失败", { description: result.error });
        return false;
      }
    } catch (error) {
      console.error('更新待办事项出错:', error);
      toast.error("更新出错");
      return false;
    }
  }

  async function handleUpdateTodoTime(todoId: number, startTime: string, endTime: string) {
    const todoToUpdate = todos.find(item => item.todo.id === todoId)?.todo;

    if (!todoToUpdate) return;

    const updatedTodo = {
      ...todoToUpdate,
      planned_start_time: startTime,
      planned_end_time: endTime
    };

    return handleUpdateTodo(updatedTodo);
  }

  async function handleStartPomodoro(todoId: number) {
    try {
      const response = await fetch('/api/pomodoro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todoId,
          duration: 25, // 默认25分钟
          startTime: new Date().toISOString()
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/pomodoro/${result.data.id}`);
      } else {
        toast.error("开始番茄钟失败", { description: result.error });
      }
    } catch (error) {
      console.error('开始番茄钟出错:', error);
      toast.error("开始番茄钟出错");
    }
  }

  async function handleBatchUpdateTodos(todos: Todo[]) {
    try {
      const response = await fetch('/api/todo/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todos }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("批量更新成功");
        fetchTodos(); // 重新获取待办事项
        return true;
      } else {
        toast.error("批量更新失败", { description: result.error });
        return false;
      }
    } catch (error) {
      console.error('批量更新待办事项出错:', error);
      toast.error("批量更新出错");
      return false;
    }
  }

  function handleStartDay() {
    setShowWelcome(false);
    localStorage.setItem("lastWelcomeDate", new Date().toDateString());
  }

  if (showWelcome) {
    return <DailyWelcome onStart={handleStartDay} />;
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">开始今天</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="planning">日常规划</TabsTrigger>
          <TabsTrigger value="timeline">时间线视图</TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="mt-4">
          <DailyPlanning
            todos={todos}
            yesterdayTodos={todosYesterday}
            onUpdateTodo={handleUpdateTodo}
            onBatchUpdateTodos={handleBatchUpdateTodos}
            onChangeTab={() => setActiveTab("timeline")}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <DailyTimelineView
            todos={todos}
            pomodoroSessions={pomodoroSessions}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onUpdateTodoTime={handleUpdateTodoTime}
            onStartPomodoro={handleStartPomodoro}
            onEditTodo={(todo) => {
              // 编辑待办事项逻辑
              // 可以实现一个编辑对话框
              console.log("Edit todo:", todo);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
