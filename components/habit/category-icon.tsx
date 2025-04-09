import { Heart, Brain, BookOpen, Users, Zap } from "lucide-react";
import { HabitCategory } from "@/types/habit";

interface CategoryIconProps {
  category: HabitCategory;
  size?: number;
  className?: string;
}

export const categoryIcons = {
  health: Heart,
  productivity: Zap,
  mindfulness: Brain,
  learning: BookOpen,
  social: Users,
};

export const categoryNames = {
  health: "健康",
  productivity: "效率",
  mindfulness: "心灵",
  learning: "学习",
  social: "社交",
};

export function CategoryIcon({ category, size = 16, className = "" }: CategoryIconProps) {
  const Icon = categoryIcons[category] || Zap;
  
  return <Icon size={size} className={className} />;
}
