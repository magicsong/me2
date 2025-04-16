'use client';

import React, { useState, useEffect } from 'react';
import { TodoList } from '@/components/daily-start/todo-list';
import { TagManager } from '@/components/daily-start/tag-manager';
import { Tag, filterTagsByKind, generateRandomColor } from '@/lib/tag-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function TodoPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeTab, setActiveTab] = useState('todos');
  const [isLoading, setIsLoading] = useState(true);

  // 获取所有标签
  useEffect(() => {
    async function fetchTags() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/tag');
        
        if (!response.ok) {
          throw new Error('获取标签失败');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setTags(result.data.map((tag: any) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            kind: tag.kind
          })));
        } else {
          toast.error('获取标签失败', { description: result.error });
        }
      } catch (error) {
        console.error('获取标签出错:', error);
        toast.error('获取标签时出错');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTags();
  }, []);

  // 处理创建标签
  const handleCreateTag = async (tag: Omit<Tag, "id">): Promise<boolean> => {
    try {
      const response = await fetch('/api/tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: {
            name: tag.name,
            color: tag.color || generateRandomColor(),
            kind: tag.kind
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('创建标签失败');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // 将新标签添加到本地状态
        setTags(prevTags => [...prevTags, {
          id: result.data.id,
          name: result.data.name,
          color: result.data.color,
          kind: result.data.kind
        }]);
        
        toast.success('标签创建成功');
        return true;
      } else {
        toast.error('创建标签失败', { description: result.error });
        return false;
      }
    } catch (error) {
      console.error('创建标签出错:', error);
      toast.error('创建标签时出错');
      return false;
    }
  };

  // 处理更新标签
  const handleUpdateTag = async (tag: Tag): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tag/${tag.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          data: {
            id: tag.id,
            name: tag.name,
            color: tag.color,
            kind: tag.kind
          } 
        }),
      });
      
      if (!response.ok) {
        throw new Error('更新标签失败');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // 更新本地状态
        setTags(prevTags => 
          prevTags.map(item => item.id === tag.id ? tag : item)
        );
        
        toast.success('标签更新成功');
        return true;
      } else {
        toast.error('更新标签失败', { description: result.error });
        return false;
      }
    } catch (error) {
      console.error('更新标签出错:', error);
      toast.error('更新标签时出错');
      return false;
    }
  };

  // 处理删除标签
  const handleDeleteTag = async (tagId: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tag/${tagId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('删除标签失败');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // 从本地状态中移除标签
        setTags(prevTags => prevTags.filter(tag => tag.id !== tagId));
        
        toast.success('标签删除成功');
        return true;
      } else {
        toast.error('删除标签失败', { description: result.error });
        return false;
      }
    } catch (error) {
      console.error('删除标签出错:', error);
      toast.error('删除标签时出错');
      return false;
    }
  };

  // 获取待办事项相关的标签
  const todoTags = filterTagsByKind(tags, 'todo');
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">任务管理系统</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="todos">任务列表</TabsTrigger>
          <TabsTrigger value="tags">标签管理</TabsTrigger>
        </TabsList>
        
        <TabsContent value="todos" className="mt-6">
          <TodoList tags={todoTags} />
        </TabsContent>
        
        <TabsContent value="tags" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin h-8 w-8 border-t-2 border-blue-500 rounded-full"></div>
            </div>
          ) : (
            <TagManager
              tags={tags}
              onCreateTag={handleCreateTag}
              onUpdateTag={handleUpdateTag}
              onDeleteTag={handleDeleteTag}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
