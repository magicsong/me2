import React, { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  SunIcon, 
  ArrowRightIcon, 
  RefreshCwIcon,
  ClipboardListIcon,
  GridIcon,
  ClockIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from "lucide-react";
import { toast } from "sonner";

interface DailyPlanningStepsProps {
  onStartFocusing: () => void;
}

export function DailyPlanningSteps({ onStartFocusing }: DailyPlanningStepsProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [intention, setIntention] = useState("");
  const [aiGeneratedTodos, setAiGeneratedTodos] = useState<string[]>([]);
  const [quadrantTasks, setQuadrantTasks] = useState({
    urgentImportant: "",
    notUrgentImportant: "",
    urgentNotImportant: "",
    notUrgentNotImportant: ""
  });
  const [timeSchedule, setTimeSchedule] = useState("");

  // 检查本地存储是否已经完成了今天的规划
  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const completedDate = localStorage.getItem("planningCompletedDate");
    if (completedDate === today) {
      setIsCompleted(true);
    }
  }, []);

  const steps = [
    { id: 1, title: "迁移昨日TODO", icon: <ClipboardListIcon className="h-4 w-4" /> },
    { id: 2, title: "今日规划", icon: <SunIcon className="h-4 w-4" /> },
    { id: 3, title: "四象限规划", icon: <GridIcon className="h-4 w-4" /> },
    { id: 4, title: "时间安排", icon: <ClockIcon className="h-4 w-4" /> }
  ];

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      completePlanning();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completePlanning = () => {
    // 保存所有规划数据
    localStorage.setItem("dailyIntention", intention);
    localStorage.setItem("planningCompletedDate", new Date().toISOString().split('T')[0]);
    setIsCompleted(true);
    toast.success("每日规划已完成！");
  };

  const resetPlanning = () => {
    setIsCompleted(false);
    setCurrentStep(1);
  };

  const simulateAiGeneration = () => {
    // 模拟AI生成TODO列表
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: '正在生成任务清单...',
        success: () => {
          setAiGeneratedTodos([
            "完成项目A的开发任务",
            "回复重要邮件",
            "准备明天的会议材料",
            "每日代码审核"
          ]);
          return "任务清单已生成!";
        },
        error: "生成失败，请重试"
      }
    );
  };

  const generateTimeSchedule = () => {
    // 模拟AI生成时间表
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: '正在规划您的时间表...',
        success: () => {
          setTimeSchedule(
            "09:00 - 10:30 专注工作：完成项目A开发\n" +
            "10:30 - 11:00 休息\n" +
            "11:00 - 12:00 回复邮件\n" +
            "12:00 - 13:00 午餐休息\n" +
            "13:00 - 15:00 准备会议材料\n" +
            "15:00 - 15:30 休息\n" +
            "15:30 - 17:00 代码审核\n" +
            "17:00 - 17:30 日总结"
          );
          return "时间表已生成!";
        },
        error: "生成失败，请重试"
      }
    );
  };

  if (isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SunIcon className="h-5 w-5 text-yellow-500" />
              今日规划已完成
            </div>
            <Button variant="outline" size="sm" onClick={resetPlanning}>
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              重新规划
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h3 className="font-medium">今日意图:</h3>
            <p className="text-muted-foreground bg-secondary/20 p-3 rounded-md">{intention || "未设置今日意图"}</p>
            
            <Button className="w-full mt-4" onClick={onStartFocusing}>
              开始专注
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SunIcon className="h-5 w-5 text-yellow-500" />
            每日规划
          </div>
          <div className="text-sm text-muted-foreground">
            步骤 {currentStep}/{steps.length}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            {steps.map((step) => (
              <TabsTrigger
                key={step.id}
                value={step.id.toString()}
                disabled={true}
                className={`flex items-center gap-1 ${currentStep === step.id ? "bg-primary text-primary-foreground" : ""}`}
              >
                {step.icon}
                <span className="hidden sm:inline">{step.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="space-y-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">迁移昨日未完成的任务</h3>
              <p className="text-muted-foreground">在前一个标签页中，您可以选择并迁移昨日未完成的任务</p>
              <div className="flex justify-end">
                <Button onClick={nextStep}>
                  继续
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">今日规划</h3>
              <p className="text-muted-foreground">描述今天的主要目标和意图</p>
              <Textarea
                placeholder="今天我想要..."
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                className="min-h-[100px]"
              />
              
              {aiGeneratedTodos.length > 0 ? (
                <div className="bg-secondary/20 p-3 rounded-md space-y-2">
                  <h4 className="font-medium">AI生成的任务建议:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {aiGeneratedTodos.map((todo, index) => (
                      <li key={index}>{todo}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={simulateAiGeneration}
                >
                  AI生成任务建议
                </Button>
              )}
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeftIcon className="mr-2 h-4 w-4" />
                  返回
                </Button>
                <Button onClick={nextStep}>
                  继续
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">四象限规划</h3>
              <p className="text-muted-foreground">按照优先级对任务进行分类</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">紧急且重要</h4>
                  <Textarea
                    placeholder="输入任务..."
                    className="h-24"
                    value={quadrantTasks.urgentImportant}
                    onChange={(e) => setQuadrantTasks({...quadrantTasks, urgentImportant: e.target.value})}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">重要但不紧急</h4>
                  <Textarea
                    placeholder="输入任务..."
                    className="h-24"
                    value={quadrantTasks.notUrgentImportant}
                    onChange={(e) => setQuadrantTasks({...quadrantTasks, notUrgentImportant: e.target.value})}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">紧急但不重要</h4>
                  <Textarea
                    placeholder="输入任务..."
                    className="h-24"
                    value={quadrantTasks.urgentNotImportant}
                    onChange={(e) => setQuadrantTasks({...quadrantTasks, urgentNotImportant: e.target.value})}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">既不紧急也不重要</h4>
                  <Textarea
                    placeholder="输入任务..."
                    className="h-24"
                    value={quadrantTasks.notUrgentNotImportant}
                    onChange={(e) => setQuadrantTasks({...quadrantTasks, notUrgentNotImportant: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeftIcon className="mr-2 h-4 w-4" />
                  返回
                </Button>
                <Button onClick={nextStep}>
                  继续
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold">AI时间安排</h3>
              <p className="text-muted-foreground">根据您的任务，AI将为您安排今日时间表</p>
              
              {timeSchedule ? (
                <div className="bg-secondary/20 p-3 rounded-md whitespace-pre-line">
                  <h4 className="font-medium mb-2">您的今日时间表:</h4>
                  {timeSchedule}
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={generateTimeSchedule}
                  className="w-full"
                >
                  生成时间安排
                </Button>
              )}
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeftIcon className="mr-2 h-4 w-4" />
                  返回
                </Button>
                <Button onClick={completePlanning}>
                  <CheckIcon className="mr-2 h-4 w-4" />
                  完成规划
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
