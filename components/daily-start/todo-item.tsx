import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TodoPriority } from "@/components/daily-start/todo-priority";
import { cn } from "@/lib/utils";
import { CheckIcon, ArrowRightIcon, CalendarIcon } from "lucide-react";
import { TodoBO } from "@/app/api/todo/types";

interface TodoItemProps {
  todo: TodoBO;
  tags: { id: number; name: string; color: string }[];
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onUpdate: (todo: TodoBO) => Promise<boolean>;
}

export function TodoItem({ todo, tags, selected, onSelect, onUpdate }: TodoItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  // 处理完成待办事项
  async function handleComplete() {
    setIsCompleting(true);

    try {
      const updatedTodo = {
        ...todo,
        status: todo.status === "completed" ? "active" : "completed",
        completed_at: todo.status === "completed" ? null : new Date().toISOString()
      };

      const success = await onUpdate(updatedTodo);
      if (!success) {
        throw new Error("更新失败");
      }
    } catch (error) {
      console.error("完成待办事项失败:", error);
    } finally {
      setIsCompleting(false);
    }
  }

  // 处理移动到今天
  async function handleMoveToToday() {
    try {
      const updatedTodo = {
        ...todo,
        planned_date: new Date().toISOString() // 设置为今天
      };

      await onUpdate(updatedTodo);
    } catch (error) {
      console.error("移动待办事项失败:", error);
    }
  }

  return (
    <Card className={cn(
      "border",
      selected && "border-primary bg-primary/5",
      todo.status === "completed" && "opacity-70"
    )}>
      <CardContent className="flex items-center p-3 gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          className="h-5 w-5"
        />

        <Button
          variant="ghost"
          size="sm"
          className="p-0 h-6 w-6"
          disabled={isCompleting}
          onClick={handleComplete}
        >
          <CheckIcon className={cn(
            "h-4 w-4",
            todo.status === "completed" ? "text-green-500" : "text-muted-foreground"
          )} />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TodoPriority priority={todo.priority} showLabel={false} />
            <span className={cn(
              "font-medium truncate",
              todo.status === "completed" && "line-through"
            )}>
              {todo.title}
            </span>
          </div>

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap mt-1 gap-1">
              {tags.map(tag => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {todo.plannedDate !== new Date().toISOString().split('T')[0] && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={handleMoveToToday}
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            今天
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
