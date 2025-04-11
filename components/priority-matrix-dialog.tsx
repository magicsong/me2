'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Clock, Star, AlertTriangle, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TodoWithTags, Todo } from '@/components/todolist-container';
import { Badge } from '@/components/ui/badge';

// 定义四象限类型
type QuadrantType = 'urgent-important' | 'noturgent-important' | 'urgent-notimportant' | 'noturgent-notimportant';

interface PriorityMatrixDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todos: TodoWithTags[];
  onUpdateTodos: (todos: Todo[]) => Promise<boolean>;
}

export function PriorityMatrixDialog({ 
  open, 
  onOpenChange, 
  todos, 
  onUpdateTodos 
}: PriorityMatrixDialogProps) {
  // 按照四象限分类待办事项
  const [quadrants, setQuadrants] = useState<Record<QuadrantType, TodoWithTags[]>>({
    'urgent-important': [],
    'noturgent-important': [],
    'urgent-notimportant': [],
    'noturgent-notimportant': []
  });
  
  // 跟踪已更改的待办事项
  const [changedTodos, setChangedTodos] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 当弹窗打开时，分配待办事项到四象限
  useEffect(() => {
    if (open) {
      categorizeToQuadrants();
    }
  }, [open, todos]);

  // 分类待办事项到四象限
  const categorizeToQuadrants = () => {
    const matrix: Record<QuadrantType, TodoWithTags[]> = {
      'urgent-important': [],
      'noturgent-important': [],
      'urgent-notimportant': [],
      'noturgent-notimportant': []
    };
    
    todos.forEach(item => {
      const { priority } = item.todo;
      
      if (priority === 'urgent') {
        matrix['urgent-important'].push(item);
      } else if (priority === 'high') {
        matrix['noturgent-important'].push(item);
      } else if (priority === 'medium') {
        matrix['urgent-notimportant'].push(item);
      } else {
        matrix['noturgent-notimportant'].push(item);
      }
    });
    
    setQuadrants(matrix);
    setChangedTodos({});
  };

  // 将优先级字符串转换为象限类型
  const getPriorityFromQuadrant = (quadrant: QuadrantType): string => {
    switch (quadrant) {
      case 'urgent-important': return 'urgent';
      case 'noturgent-important': return 'high';
      case 'urgent-notimportant': return 'medium';
      case 'noturgent-notimportant': return 'low';
      default: return 'medium';
    }
  };

  // 处理拖拽开始
  const handleDragStart = (e: React.DragEvent, todoId: number) => {
    e.dataTransfer.setData('todoId', todoId.toString());
  };

  // 允许放置
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // 处理放置
  const handleDrop = (e: React.DragEvent, targetQuadrant: QuadrantType) => {
    e.preventDefault();
    const todoId = parseInt(e.dataTransfer.getData('todoId'));
    
    // 找出待办事项当前所在的象限
    let currentQuadrant: QuadrantType | null = null;
    let todoItem: TodoWithTags | null = null;
    
    for (const [quadrant, items] of Object.entries(quadrants)) {
      const foundItem = items.find(item => item.todo.id === todoId);
      if (foundItem) {
        currentQuadrant = quadrant as QuadrantType;
        todoItem = foundItem;
        break;
      }
    }
    
    if (!todoItem || !currentQuadrant || currentQuadrant === targetQuadrant) return;
    
    // 从原象限移除
    const updatedQuadrants = { ...quadrants };
    updatedQuadrants[currentQuadrant] = updatedQuadrants[currentQuadrant].filter(
      item => item.todo.id !== todoId
    );
    
    // 添加到目标象限
    updatedQuadrants[targetQuadrant].push(todoItem);
    
    setQuadrants(updatedQuadrants);
    
    // 记录更改
    setChangedTodos({
      ...changedTodos,
      [todoId]: getPriorityFromQuadrant(targetQuadrant)
    });
  };

  // 保存所有更改
  const handleSaveChanges = async () => {
    if (Object.keys(changedTodos).length === 0) {
      onOpenChange(false);
      return;
    }
    
    setIsSaving(true);
    
    try {
      // 收集所有已更改的待办事项
      const todosToUpdate: Todo[] = [];
      
      todos.forEach(({ todo }) => {
        if (changedTodos[todo.id]) {
          todosToUpdate.push({
            ...todo,
            priority: changedTodos[todo.id]
          });
        }
      });
      
      if (todosToUpdate.length > 0) {
        const success = await onUpdateTodos(todosToUpdate);
        if (success) {
          onOpenChange(false);
        }
      } else {
        onOpenChange(false);
      }
    } catch (error) {
      console.error('保存优先级更改失败:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 渲染单个待办事项
  const renderTodoItem = (item: TodoWithTags) => {
    const { todo, tags } = item;
    const hasChanged = changedTodos[todo.id] !== undefined;
    
    return (
      <Card 
        key={todo.id}
        className={cn(
          "mb-2 hover:shadow-md transition-shadow cursor-grab",
          hasChanged && "border-primary border-2"
        )}
        draggable
        onDragStart={(e) => handleDragStart(e, todo.id)}
      >
        <CardContent className="p-3">
          <div className="font-medium text-sm truncate">{todo.title}</div>
          {tags.length > 0 && (
            <div className="flex flex-wrap mt-1 gap-1">
              {tags.slice(0, 2).map(tag => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
              {tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // 获取象限标题和图标
  const getQuadrantInfo = (quadrant: QuadrantType) => {
    switch (quadrant) {
      case 'urgent-important':
        return { 
          title: '紧急且重要', 
          description: '立即处理',
          icon: <AlertCircle className="h-5 w-5 text-red-500" />,
          className: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
        };
      case 'noturgent-important':
        return { 
          title: '重要不紧急', 
          description: '安排时间处理',
          icon: <Star className="h-5 w-5 text-orange-500" />,
          className: 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
        };
      case 'urgent-notimportant':
        return { 
          title: '紧急不重要', 
          description: '考虑委派',
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          className: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
        };
      case 'noturgent-notimportant':
        return { 
          title: '不紧急不重要', 
          description: '考虑忽略',
          icon: <Inbox className="h-5 w-5 text-blue-500" />,
          className: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
        };
      default:
        return { 
          title: '', 
          description: '',
          icon: null,
          className: ''
        };
    }
  };

  // 渲染象限
  const renderQuadrant = (quadrant: QuadrantType) => {
    const { title, description, icon, className } = getQuadrantInfo(quadrant);
    
    return (
      <div 
        className={cn(
          "border rounded-lg overflow-hidden flex flex-col h-full",
          className
        )}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, quadrant)}
      >
        <div className="p-3 border-b flex items-center gap-2">
          {icon}
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="p-3 flex-1 overflow-y-auto max-h-[300px]">
          {quadrants[quadrant].length > 0 ? (
            quadrants[quadrant].map(item => renderTodoItem(item))
          ) : (
            <p className="text-muted-foreground text-center text-sm py-4">
              拖拽任务到此区域
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>四象限任务规划</DialogTitle>
          <DialogDescription>
            根据任务的紧急程度和重要程度进行分类，通过拖拽任务到不同象限来调整优先级
          </DialogDescription>
        </DialogHeader>
        
        {Object.keys(changedTodos).length > 0 && (
          <Alert className="mb-4">
            <AlertDescription>
              已修改 {Object.keys(changedTodos).length} 个任务的优先级，点击保存生效
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderQuadrant('urgent-important')}
          {renderQuadrant('noturgent-important')}
          {renderQuadrant('urgent-notimportant')}
          {renderQuadrant('noturgent-notimportant')}
        </div>
        
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button 
            onClick={handleSaveChanges} 
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "保存更改"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
