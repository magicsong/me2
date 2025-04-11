'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Play, Edit2, MoveRight, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { Todo, TodoWithTags, PomodoroSession } from './todolist-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { PriorityMatrixDialog } from './priority-matrix-dialog';
import { toast } from 'sonner';

interface DailyTimelineViewProps {
  todos: TodoWithTags[];
  pomodoroSessions: PomodoroSession[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onUpdateTodoTime: (todoId: number, startTime: string, endTime: string) => void;
  onStartPomodoro: (todoId: number) => void;
  onEditTodo: (todo: Todo) => void;
  onBatchUpdateTodos?: (todos: Todo[]) => Promise<boolean>;
}

export function DailyTimelineView({
  todos,
  pomodoroSessions,
  selectedDate,
  onDateChange,
  onUpdateTodoTime,
  onStartPomodoro,
  onEditTodo,
  onBatchUpdateTodos
}: DailyTimelineViewProps) {
  const [isAddingTimeBlock, setIsAddingTimeBlock] = useState(false);
  const [draggedTodoId, setDraggedTodoId] = useState<number | null>(null);
  const [draggedStartHour, setDraggedStartHour] = useState<number | null>(null);
  const [isPriorityMatrixOpen, setIsPriorityMatrixOpen] = useState(false);
  const [isLoadingYesterday, setIsLoadingYesterday] = useState(false);
  const [yesterdayTodos, setYesterdayTodos] = useState<TodoWithTags[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  // 处理日期切换
  const handlePreviousDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };
  
  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };
  
  const handleTodayClick = () => {
    onDateChange(new Date());
  };

  // 获取昨天的未完成任务
  const fetchYesterdayTodos = async () => {
    setIsLoadingYesterday(true);
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const response = await fetch(`/api/todos?date=${yesterday.toISOString()}`);
      const result = await response.json();
      
      if (result.success) {
        // 只保留未完成的任务
        const incompleteTodos = result.data.filter(
          (item: TodoWithTags) => item.todo.status !== 'completed'
        );
        setYesterdayTodos(incompleteTodos);
        return incompleteTodos;
      } else {
        console.error('获取昨日待办事项失败:', result.error);
        toast.error("获取昨日任务失败");
        return [];
      }
    } catch (error) {
      console.error('获取昨日待办事项出错:', error);
      toast.error("获取昨日任务出错");
      return [];
    } finally {
      setIsLoadingYesterday(false);
    }
  };

  // 一键迁移昨日任务到今天
  const handleMigrateYesterday = async () => {
    if (!onBatchUpdateTodos) {
      toast.error("批量更新功能未提供");
      return;
    }

    setIsLoadingYesterday(true);
    try {
      const yesterdayItems = await fetchYesterdayTodos();
      
      if (yesterdayItems.length === 0) {
        toast.info("没有需要迁移的任务");
        return;
      }
      
      // 将所有未完成的任务移动到今天
      const todosToUpdate = yesterdayItems.map(({ todo }) => ({
        ...todo,
        planned_date: new Date().toISOString().split('T')[0] // 设置为今天
      }));
      
      const success = await onBatchUpdateTodos(todosToUpdate);
      
      if (success) {
        toast.success(`已迁移 ${todosToUpdate.length} 个任务到今天`);
      } else {
        toast.error("迁移任务失败");
      }
    } catch (error) {
      console.error('迁移任务出错:', error);
      toast.error("迁移任务出错");
    } finally {
      setIsLoadingYesterday(false);
    }
  };

  // 处理更新任务优先级
  const handleUpdateTodoPriorities = async (updatedTodos: Todo[]) => {
    if (!onBatchUpdateTodos) {
      toast.error("批量更新功能未提供");
      return false;
    }
    
    try {
      const success = await onBatchUpdateTodos(updatedTodos);
      if (success) {
        toast.success("任务优先级已更新");
      }
      return success;
    } catch (error) {
      console.error('更新任务优先级出错:', error);
      toast.error("更新任务优先级失败");
      return false;
    }
  };

  // 开始拖拽事件
  const handleDragStart = (todoId: number, hour: number) => {
    setDraggedTodoId(todoId);
    setDraggedStartHour(hour);
  };

  // 拖拽结束事件
  const handleDragEnd = (endHour: number) => {
    if (draggedTodoId && draggedStartHour !== null) {
      let startHour = Math.min(draggedStartHour, endHour);
      let endHourValue = Math.max(draggedStartHour, endHour) + 1;
      
      // 确保在0-24小时范围内
      startHour = Math.max(0, Math.min(23, startHour));
      endHourValue = Math.max(1, Math.min(24, endHourValue));
      
      // 转换为ISO时间字符串
      const startDate = new Date(selectedDate);
      startDate.setHours(startHour, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setHours(endHourValue, 0, 0, 0);
      
      onUpdateTodoTime(draggedTodoId, startDate.toISOString(), endDate.toISOString());
      
      // 重置拖拽状态
      setDraggedTodoId(null);
      setDraggedStartHour(null);
    }
  };

  // 获取特定时间段内的待办事项
  const getTodosForHour = (hour: number) => {
    return todos.filter(({ todo }) => {
      if (!todo.planned_start_time || !todo.planned_end_time) return false;
      
      const startTime = new Date(todo.planned_start_time);
      const endTime = new Date(todo.planned_end_time);
      
      return startTime.getHours() <= hour && endTime.getHours() > hour;
    });
  };

  // 获取特定时间段内的番茄钟会话
  const getSessionsForHour = (hour: number) => {
    return pomodoroSessions.filter(session => {
      const startTime = new Date(session.start_time);
      const endTime = new Date(session.end_time);
      return startTime.getHours() <= hour && endTime.getHours() > hour;
    });
  };

  // 将当前未计划的待办事项添加到时间块
  const addTodoToTimeBlock = (todoId: number, hour: number) => {
    const startHour = hour;
    const endHour = hour + 1;
    
    const startDate = new Date(selectedDate);
    startDate.setHours(startHour, 0, 0, 0);
    
    const endDate = new Date(selectedDate);
    endDate.setHours(endHour, 0, 0, 0);
    
    onUpdateTodoTime(todoId, startDate.toISOString(), endDate.toISOString());
  };

  // 获取当天的待办事项完成率
  const getCompletionRate = () => {
    if (todos.length === 0) return 0;
    const completedTodos = todos.filter(({ todo }) => todo.status === 'completed').length;
    return Math.round((completedTodos / todos.length) * 100);
  };

  // 获取番茄钟总时长（分钟）
  const getTotalPomodoroMinutes = () => {
    return pomodoroSessions.reduce((total, session) => 
      total + (session.is_completed ? session.duration : 0), 0);
  };

  // 计算待办事项的背景颜色（基于优先级）
  const getTodoBackgroundColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-800';
      case 'high': return 'bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-800';
      case 'low': return 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-800';
      default: return 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-800';
    }
  };

  // 渲染每小时的时间块
  const renderHourBlocks = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="relative mt-8">
        {hours.map(hour => {
          const hourTodos = getTodosForHour(hour);
          const hourSessions = getSessionsForHour(hour);
          
          // 计算这个小时内的实际工作比例
          const totalSessionMinutes = hourSessions.reduce((total, session) => {
            if (!session.is_completed) return total;
            
            const startTime = new Date(session.start_time);
            const endTime = new Date(session.end_time);
            
            // 计算该小时内的番茄钟分钟数
            let minutes = 0;
            const hourStart = new Date(selectedDate);
            hourStart.setHours(hour, 0, 0, 0);
            
            const hourEnd = new Date(selectedDate);
            hourEnd.setHours(hour + 1, 0, 0, 0);
            
            const sessionStartInHour = startTime < hourStart ? hourStart : startTime;
            const sessionEndInHour = endTime > hourEnd ? hourEnd : endTime;
            
            if (sessionEndInHour > sessionStartInHour) {
              minutes = (sessionEndInHour.getTime() - sessionStartInHour.getTime()) / (1000 * 60);
            }
            
            return total + minutes;
          }, 0);
          
          // 计算工作比例（最大为100%）
          const workRatio = Math.min(1, totalSessionMinutes / 60);
          
          return (
            <div 
              key={hour}
              className={cn(
                "flex h-24 border-t border-gray-200",
                hour % 2 === 0 ? "bg-background" : "bg-secondary/20"
              )}
              onClick={() => isAddingTimeBlock ? setIsAddingTimeBlock(false) : null}
              onDragOver={e => e.preventDefault()}
              onDrop={() => draggedTodoId ? handleDragEnd(hour) : null}
            >
              <div className="w-16 flex flex-col justify-start items-center pt-1 text-sm text-muted-foreground border-r">
                <span>{hour}:00</span>
              </div>
              
              <div className="flex-1 relative">
                {/* 显示实际工作时间指示器 */}
                {workRatio > 0 && (
                  <div 
                    className="absolute left-0 bottom-0 bg-primary/30 pointer-events-none"
                    style={{
                      width: `${workRatio * 100}%`,
                      height: '4px'
                    }}
                  />
                )}
                
                {/* 显示已计划的待办事项 */}
                <div className="p-1 h-full">
                  {hourTodos.map(({ todo, tags }) => (
                    <div 
                      key={todo.id}
                      className={cn(
                        "h-[calc(100%-4px)] border rounded-md p-1 mb-1 text-sm cursor-grab relative",
                        getTodoBackgroundColor(todo.priority)
                      )}
                      draggable
                      onDragStart={() => handleDragStart(todo.id, hour)}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-medium truncate">{todo.title}</span>
                        <div className="flex gap-1">
                          <button 
                            className="text-blue-600 hover:text-blue-800 p-0.5 rounded-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTodo(todo);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-800 p-0.5 rounded-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartPomodoro(todo.id);
                            }}
                          >
                            <Play className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染未计划的待办事项列表
  const renderUnscheduledTodos = () => {
    const unscheduledTodos = todos.filter(({ todo }) => !todo.planned_start_time);
    
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">未计划的待办事项</h3>
        {unscheduledTodos.length === 0 ? (
          <p className="text-muted-foreground">没有未计划的待办事项</p>
        ) : (
          <div className="flex flex-col gap-2">
            {unscheduledTodos.map(({ todo }) => (
              <Card key={todo.id} className="border">
                <CardContent className="flex items-center justify-between p-3">
                  <span className="font-medium">{todo.title}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsAddingTimeBlock(true);
                      addTodoToTimeBlock(todo.id, 8); // 默认添加到8点
                    }}
                  >
                    添加到时间块
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 日期选择器和功能按钮 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handlePreviousDay}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            前一天
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextDay}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            后一天
          </Button>
          <Button variant="outline" size="sm" onClick={handleTodayClick}>
            今天
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsPriorityMatrixOpen(true)}
            className="flex items-center gap-1"
          >
            <Grid className="h-4 w-4" />
            四象限规划
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleMigrateYesterday}
            disabled={isLoadingYesterday}
            className="flex items-center gap-1"
          >
            <MoveRight className="h-4 w-4" />
            迁移昨日任务
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"ghost"}
                className={cn(
                  "justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "yyyy年MM月dd日")
                ) : (
                  <span>选择日期</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateChange}
                disabled={(date) =>
                  date > endOfDay(new Date()) || date < subDays(new Date(), 365)
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* 统计信息 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <h3 className="text-lg font-semibold">完成率</h3>
              <p className="text-muted-foreground">今日完成的待办事项</p>
            </div>
            <Badge className="rounded-full px-3 py-1 text-lg">{getCompletionRate()}%</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <h3 className="text-lg font-semibold">番茄钟</h3>
              <p className="text-muted-foreground">今日专注时长</p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{Math.floor(getTotalPomodoroMinutes() / 60)} 小时 {getTotalPomodoroMinutes() % 60} 分钟</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 时间轴视图 */}
      <div className="overflow-x-auto" ref={timelineRef}>
        {renderHourBlocks()}
      </div>
      
      {/* 未计划的待办事项 */}
      {renderUnscheduledTodos()}

      {/* 四象限规划弹窗 */}
      <PriorityMatrixDialog
        open={isPriorityMatrixOpen}
        onOpenChange={setIsPriorityMatrixOpen}
        todos={todos}
        onUpdateTodos={handleUpdateTodoPriorities}
      />
    </div>
  );
}
