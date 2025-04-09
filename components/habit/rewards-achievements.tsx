import { Habit } from "@/types/habit"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Award, Medal, Star, Trophy } from "lucide-react"

interface RewardsAchievementsProps {
  habits: Habit[]
}

export function RewardsAchievements({ habits }: RewardsAchievementsProps) {
  // 计算成就数据
  const activeHabitsCount = habits.filter(h => h.status === "active").length
  const completedHabitsCount = habits.filter(h => h.status === "completed").length
  const totalHabits = habits.length
  
  // 示例成就
  const achievements = [
    {
      name: "坚持不懈",
      description: "连续30天完成习惯",
      icon: <Trophy className="h-6 w-6 text-yellow-500" />,
      unlocked: activeHabitsCount >= 3,
    },
    {
      name: "初露锋芒",
      description: "完成第一个习惯",
      icon: <Star className="h-6 w-6 text-blue-500" />,
      unlocked: completedHabitsCount > 0,
    },
    {
      name: "多面手",
      description: "创建5种不同类型的习惯",
      icon: <Medal className="h-6 w-6 text-purple-500" />,
      unlocked: totalHabits >= 5,
    },
    {
      name: "习惯大师",
      description: "同时维持10个活跃习惯",
      icon: <Award className="h-6 w-6 text-green-500" />,
      unlocked: activeHabitsCount >= 10,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>奖励与成就</CardTitle>
        <CardDescription>您获得的成就和奖励</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {achievements.map((achievement, index) => (
            <div 
              key={index} 
              className={`flex flex-col items-center rounded-lg border p-3 text-center ${
                achievement.unlocked 
                  ? "border-primary bg-primary/10" 
                  : "border-muted bg-muted/50 opacity-50"
              }`}
            >
              <div className="mb-2">{achievement.icon}</div>
              <h3 className="text-sm font-medium">{achievement.name}</h3>
              <p className="text-xs text-muted-foreground">{achievement.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
