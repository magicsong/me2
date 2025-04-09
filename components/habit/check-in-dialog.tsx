import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Habit } from "@/types/habit";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface CheckInDialogProps {
  open: boolean;
  habit: Habit | null;
  onClose: () => void;
  onCheckIn: (habitId: string, tierId?: number, comment?: string) => Promise<void>;
}

interface Tier {
  id: number;
  name: string;
  level: number;
  description?: string;
  reward_points: number;
}

const checkInSchema = z.object({
  tierId: z.string().optional(),
  comment: z.string().optional(),
});

export function CheckInDialog({ open, habit, onClose, onCheckIn }: CheckInDialogProps) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof checkInSchema>>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      tierId: undefined,
      comment: "",
    },
  });

  useEffect(() => {
    form.reset({
      tierId: undefined,
      comment: "",
    });
    
    if (open && habit) {
      fetchTiers(habit.id);
    }
  }, [open, habit, form]);

  async function fetchTiers(habitId: string) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/habit/tiers?habitId=${habitId}`);
      const result = await response.json();
      
      if (result.success) {
        setTiers(result.data);
      } else {
        console.error('获取挑战阶梯失败:', result.error);
      }
    } catch (error) {
      console.error('获取挑战阶梯出错:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(values: z.infer<typeof checkInSchema>) {
    if (!habit) return;
    
    setIsSubmitting(true);
    try {
      await onCheckIn(
        habit.id, 
        values.tierId ? parseInt(values.tierId) : undefined,
        values.comment
      );
      onClose();
    } catch (error) {
      console.error('打卡出错:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>习惯打卡 - {habit?.name}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {tiers.length > 0 && (
              <FormField
                control={form.control}
                name="tierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>选择挑战阶梯（可选）</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择挑战阶梯" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tiers.map(tier => (
                          <SelectItem key={tier.id} value={tier.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span>Lv.{tier.level} {tier.name}</span>
                              <Badge variant="secondary">+{tier.reward_points}点</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      完成更高级的挑战可以获得额外奖励点数
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>打卡感想（可选）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="今天完成这个习惯的感受..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    打卡中...
                  </>
                ) : (
                  "完成打卡"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
