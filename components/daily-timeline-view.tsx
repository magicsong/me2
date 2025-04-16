'use client';

import { useState, useRef } from 'react';
import { CalendarIcon, Edit2, Play, Moon, BrainCircuit, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, addDays, subDays, endOfDay, subDays as dateFnsSubDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TodoBO } from '@/app/api/todo/types';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// 规划结果类型定义
interface PlanScheduleItem {
  taskId: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  notes: string;
}

interface PlanBreak {
  startTime: string;
  endTime: string;
  type: string;
}

interface PlanUnscheduled {
  taskId: string;
  title: string;
  reason: string;
}

interface PlanResult {
  schedule: PlanScheduleItem[];
  breaks: PlanBreak[];
  summary: string;
  unscheduled: PlanUnscheduled[];
}

interface PomodoroSession {
  todoId: number;
  startTime: string;
  endTime: string;
  completed?: boolean;
}

interface DailyTimelineViewProps {
  todos: TodoBO[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onUpdateTodoTime: (todoId: number, startTime: string, endTime: string) => void;
  onStartPomodoro: (todoId: number) => void;
  onEditTodo: (todo: TodoBO) => void;
  workingHours?: { start: number; end: number }; // 工作时间配置
  pomodoroSessions?: PomodoroSession[]; // 番茄钟分配
  onAiPlanDay?: (userPrompt: string) => Promise<PlanResult>; // 可选，如果不提供则使用内部实现
  onSavePlannedSchedule?: (schedule: PlanScheduleItem[]) => Promise<void>; // 可选，如果不提供则使用内部实现
}

export function DailyTimelineView({
  todos,
  selectedDate,
  onDateChange,
  onUpdateTodoTime,
  onStartPomodoro,
  onEditTodo,
  workingHours = { start: 9, end: 22 }, // 默认工作时间为早上9点到晚上10点
  pomodoroSessions = [],
  onAiPlanDay,
  onSavePlannedSchedule
}: DailyTimelineViewProps) {
  const [isAddingTimeBlock, setIsAddingTimeBlock] = useState(false);
  const [draggedTodoId, setDraggedTodoId] = useState<number | null>(null);
  const [draggedStartHour, setDraggedStartHour] = useState<number | null>(null);
  const [isAiPlanning, setIsAiPlanning] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [showPlanResult, setShowPlanResult] = useState(false);
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

  // 处理AI规划
  const handleAiPlan = async () => {
    setPlanDialogOpen(true);
  };

  // 调用内部的AI规划API
  const callAiPlanApi = async (prompt: string): Promise<PlanResult> => {
    try {
      const response = await fetch('/api/todo/planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: prompt,
          timeRange: `${workingHours.start}:00-${workingHours.end}:00` // 根据当前工作时间设置
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '规划请求失败');
      }

      return data.data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw new Error('无法连接到规划服务');
    }
  };

  // 内部保存规划结果的方法
  const saveScheduleInternally = async (schedule: PlanScheduleItem[]): Promise<void> => {
    try {
      // 将规划结果转换为任务更新
      const updatePromises = schedule.map(item => {
        // 尝试转换string类型的taskId为number
        const todoId = Number(item.taskId);
        
        if (isNaN(todoId)) {
          console.warn(`无效的任务ID: ${item.taskId}`);
          return Promise.resolve();
        }
        
        // 解析时间字符串
        const parseTimeString = (timeStr: string): Date => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const date = new Date(selectedDate);
          date.setHours(hours, minutes, 0, 0);
          return date;
        };
        
        const startTime = parseTimeString(item.startTime);
        const endTime = parseTimeString(item.endTime);
        
        // 调用更新函数
        return onUpdateTodoTime(todoId, startTime.toISOString(), endTime.toISOString());
      });
      
      await Promise.all(updatePromises.filter(Boolean));
      toast.success(`成功更新 ${schedule.length} 个任务的时间安排`);
    } catch (error) {
      console.error('保存规划结果失败:', error);
      throw new Error('更新任务时间失败');
    }
  };

  // 执行AI规划
  const executeAiPlan = async () => {
    if (!userPrompt.trim()) {
      toast.error("请输入规划需求");
      return;
    }

    setIsAiPlanning(true);
    setPlanDialogOpen(false);
    
    try {
      // 优先使用外部提供的规划函数，如果没有则使用内部实现
      const result = onAiPlanDay 
        ? await onAiPlanDay(userPrompt)
        : await callAiPlanApi(userPrompt);
        
      setPlanResult(result);
      setShowPlanResult(true);
      toast.success("AI已完成今日任务规划");
    } catch (error) {
      console.error('AI规划失败:', error);
      toast.error(error instanceof Error ? error.message : "AI规划失败，请稍后重试");
    } finally {
      setIsAiPlanning(false);
    }
  };

  // 保存规划结果
  const savePlanResult = async () => {
    if (!planResult || !planResult.schedule || planResult.schedule.length === 0) {
      toast.error("没有可保存的规划结果");
      return;
    }

    try {
      // 优先使用外部提供的保存函数，如果没有则使用内部实现
      if (onSavePlannedSchedule) {
        await onSavePlannedSchedule(planResult.schedule);
      } else {
        await saveScheduleInternally(planResult.schedule);
      }
      
      setShowPlanResult(false);
      setPlanResult(null);
      toast.success("规划已保存并应用到任务时间");
    } catch (error) {
      console.error('保存规划失败:', error);
      toast.error(error instanceof Error ? error.message : "保存规划失败");
    }
  };

  // 取消规划结果
  const cancelPlanResult = () => {
    setShowPlanResult(false);
    setPlanResult(null);
  };

  // 从时间格式(HH:MM)转换为小时数(带小数)
  const timeToHours = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
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
    return todos.filter(todo => {
      if (!todo.plannedStartTime || !todo.plannedEndTime) return false;
      
      const startTime = new Date(todo.plannedStartTime);
      const endTime = new Date(todo.plannedEndTime);
      
      return startTime.getHours() <= hour && endTime.getHours() > hour;
    });
  };

  // 获取特定时间段内的番茄钟会话
  const getPomodorosForHour = (hour: number) => {
    return pomodoroSessions.filter(session => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
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

  // 检查是否为工作时间
  const isWorkingHour = (hour: number) => {
    return hour >= workingHours.start && hour < workingHours.end;
  };

  // 渲染睡眠动画
  const renderSleepingAnimation = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-bounce">
          <Moon className="h-8 w-8 text-indigo-400" />
        </div>
        <p className="text-muted-foreground mt-2 text-sm">休息时间</p>
      </div>
    );
  };

  // 渲染每小时的时间块
  const renderHourBlocks = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    // 将连续的休息时间分组
    const hourGroups: Array<{start: number, end: number, isRest: boolean}> = [];
    let currentGroup: {start: number, end: number, isRest: boolean} | null = null;
    
    hours.forEach(hour => {
      const isWorking = isWorkingHour(hour);
      
      // 如果没有活动组或当前组的休息状态与当前小时不同，创建新组
      if (!currentGroup || currentGroup.isRest !== !isWorking) {
        if (currentGroup) {
          hourGroups.push(currentGroup);
        }
        currentGroup = { start: hour, end: hour + 1, isRest: !isWorking };
      } else {
        // 扩展当前组
        currentGroup.end = hour + 1;
      }
    });
    
    // 添加最后一组
    if (currentGroup) {
      hourGroups.push(currentGroup);
    }

    return (
      <div className="relative mt-8">
        {hourGroups.map((group, groupIndex) => {
          if (group.isRest) {
            // 渲染合并的休息时间块
            return (
              <div 
                key={`rest-${groupIndex}`}
                className="flex border-t border-gray-200 bg-slate-50 dark:bg-slate-900/50"
                style={{ height: '80px' }} // 使休息时间块更紧凑
              >
                <div className="w-16 flex flex-col justify-start items-center pt-1 text-sm text-muted-foreground border-r">
                  <span>{group.start}:00</span>
                  <span>|</span>
                  <span>{group.end}:00</span>
                </div>
                <div className="flex-1 relative">
                  {renderSleepingAnimation()}
                </div>
              </div>
            );
          } else {
            // 渲染工作时间块，这里需要为组中的每小时渲染单独的块
            const workingHoursInGroup = Array.from(
              { length: group.end - group.start }, 
              (_, i) => group.start + i
            );
            
            return (
              <div key={`work-${groupIndex}`}>
                {workingHoursInGroup.map(hour => {
                  const hourTodos = getTodosForHour(hour);
                  const hourPomodoros = getPomodorosForHour(hour);
                  
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
                        {hourPomodoros.length > 0 && (
                          <Badge className="mt-1 bg-red-500 text-white text-xs">
                            {hourPomodoros.length}🍅
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex-1 relative">
                        <div className="p-1 h-full">
                          {/* 显示番茄钟分配指示器 */}
                          {hourPomodoros.map((session, index) => (
                            <div 
                              key={`pomodoro-${index}`}
                              className="absolute left-0 h-1 bg-red-500 z-10"
                              style={{
                                top: `${index * 4}px`,
                                width: '100%',
                                opacity: 0.6
                              }}
                            />
                          ))}
                          
                          {/* 显示已计划的待办事项 */}
                          {hourTodos.map(todo => (
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
          }
        })}
      </div>
    );
  };

  // 渲染未计划的待办事项列表
  const renderUnscheduledTodos = () => {
    const unscheduledTodos = todos.filter(todo => !todo.plannedStartTime);
    
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">未计划的待办事项</h3>
        {unscheduledTodos.length === 0 ? (
          <p className="text-muted-foreground">没有未计划的待办事项</p>
        ) : (
          <div className="flex flex-col gap-2">
            {unscheduledTodos.map(todo => (
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

  // 渲染今日番茄钟统计
  const renderPomodoroStats = () => {
    // 计算今日番茄钟总数
    const totalPomodoros = pomodoroSessions.length;
    // 计算已完成的番茄钟数量
    const completedPomodoros = pomodoroSessions.filter(s => s.completed).length;
    // 计算总专注时间（分钟）
    const totalMinutes = pomodoroSessions.reduce((acc, session) => {
      if (!session.completed) return acc;
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      return acc + (end.getTime() - start.getTime()) / (1000 * 60);
    }, 0);

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              <h3 className="font-medium">今日番茄钟</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">{completedPomodoros}/{totalPomodoros}</span> 个番茄钟
              </div>
              <div className="text-sm">
                <span className="font-medium">{Math.floor(totalMinutes / 60)}</span> 小时 
                <span className="font-medium"> {Math.round(totalMinutes % 60)}</span> 分钟
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 将规划结果渲染到时间线上
  const renderPlannedSchedule = () => {
    if (!planResult || !showPlanResult) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">AI规划结果</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">总结</h3>
              <p className="text-muted-foreground">{planResult.summary}</p>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">时间安排</h3>
              <div className="space-y-2">
                {planResult.schedule.map((item, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.startTime} - {item.endTime} ({item.duration}分钟)</p>
                        </div>
                        <Badge className="bg-blue-500">{item.notes}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            {planResult.breaks.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">休息时间</h3>
                <div className="space-y-2">
                  {planResult.breaks.map((breakItem, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{breakItem.type}</Badge>
                      <span>{breakItem.startTime} - {breakItem.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {planResult.unscheduled.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2 text-amber-500">无法安排的任务</h3>
                <div className="space-y-2">
                  {planResult.unscheduled.map((item, index) => (
                    <Card key={index} className="border-amber-300">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">{item.title}</h4>
                          <span className="text-sm text-muted-foreground">{item.reason}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={cancelPlanResult}>取消</Button>
              <Button onClick={savePlanResult}>保存规划</Button>
            </div>
          </div>
        </div>
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
            variant="default" 
            size="sm" 
            onClick={handleAiPlan}
            disabled={isAiPlanning}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
          >
            {isAiPlanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                规划中...
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 h-4 w-4" />
                AI自动规划
              </>
            )}
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
                  date > endOfDay(new Date()) || date < dateFnsSubDays(new Date(), 365)
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* AI规划对话框 */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>AI自动规划</DialogTitle>
            <DialogDescription>
              请输入您今天的规划需求，例如"我希望今天高效完成所有紧急任务，中午有1小时的午休时间"
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prompt">规划需求</Label>
              <Textarea
                id="prompt"
                placeholder="请输入您的规划需求..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="h-32"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={executeAiPlan}>
              开始规划
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 规划结果展示 */}
      {renderPlannedSchedule()}
      
      {/* 番茄钟统计 */}
      {pomodoroSessions.length > 0 && renderPomodoroStats()}
      
      {/* 时间轴视图 */}
      <div className="overflow-x-auto" ref={timelineRef}>
        {renderHourBlocks()}
      </div>
      
      {/* 未计划的待办事项 */}
      {renderUnscheduledTodos()}
    </div>
  );
}
