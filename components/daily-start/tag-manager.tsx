import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { PlusIcon, XIcon, Settings2Icon, Save } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 标签类型
export interface Tag {
  id: number;
  name: string;
  color: string;
  kind: string;
}

// 可用的标签类型
const TAG_KINDS = [
  { value: "todo", label: "待办事项" },
  { value: "tomato", label: "番茄钟" },
  { value: "note", label: "笔记" },
  { value: "habit", label: "习惯" },
];

// 生成随机颜色
const generateRandomColor = () => {
  // 预定义的一组好看的颜色
  const colors = [
    "#F87171", // 红色
    "#FB923C", // 橙色
    "#FBBF24", // 黄色
    "#34D399", // 绿色
    "#60A5FA", // 蓝色
    "#818CF8", // 靛蓝色
    "#A78BFA", // 紫色
    "#F472B6", // 粉色
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

interface TagManagerProps {
  tags: Tag[];
  onCreateTag: (tag: Omit<Tag, "id">) => Promise<boolean>;
  onUpdateTag: (tag: Tag) => Promise<boolean>;
  onDeleteTag: (tagId: number) => Promise<boolean>;
}

export function TagManager({ tags, onCreateTag, onUpdateTag, onDeleteTag }: TagManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("");
  const [tagKind, setTagKind] = useState("todo");
  const [deleteTagId, setDeleteTagId] = useState<number | null>(null);

  // 过滤特定类型的标签
  const getTagsByKind = (kind: string) => {
    return tags.filter(tag => tag.kind === kind);
  };

  // 开始创建新标签
  const startCreateTag = () => {
    setIsEditMode(false);
    setTagName("");
    setTagColor(generateRandomColor());
    setTagKind("todo");
    setIsOpen(true);
  };

  // 开始编辑标签
  const startEditTag = (tag: Tag) => {
    setIsEditMode(true);
    setEditingTagId(tag.id);
    setTagName(tag.name);
    setTagColor(tag.color);
    setTagKind(tag.kind);
    setIsOpen(true);
  };

  // 保存标签（创建或更新）
  const saveTag = async () => {
    if (!tagName.trim()) return;

    if (isEditMode && editingTagId) {
      await onUpdateTag({
        id: editingTagId,
        name: tagName,
        color: tagColor,
        kind: tagKind
      });
    } else {
      await onCreateTag({
        name: tagName,
        color: tagColor,
        kind: tagKind
      });
    }
    
    setIsOpen(false);
    resetForm();
  };

  // 重置表单
  const resetForm = () => {
    setTagName("");
    setTagColor("");
    setTagKind("todo");
    setIsEditMode(false);
    setEditingTagId(null);
  };

  // 确认删除标签
  const confirmDeleteTag = async () => {
    if (deleteTagId) {
      await onDeleteTag(deleteTagId);
      setDeleteTagId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">标签管理</h2>
        <Button size="sm" onClick={startCreateTag}>
          <PlusIcon className="h-4 w-4 mr-1" /> 新建标签
        </Button>
      </div>

      {TAG_KINDS.map(kind => (
        <div key={kind.value} className="space-y-2">
          <h3 className="text-sm font-medium">{kind.label}</h3>
          <div className="flex flex-wrap gap-2">
            {getTagsByKind(kind.value).length > 0 ? (
              getTagsByKind(kind.value).map(tag => (
                <Badge
                  key={tag.id}
                  className="flex items-center gap-1 pl-3 pr-1 py-1"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full hover:bg-white/20"
                    onClick={() => startEditTag(tag)}
                  >
                    <Settings2Icon className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full hover:bg-white/20"
                    onClick={() => setDeleteTagId(tag.id)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">暂无标签</p>
            )}
          </div>
        </div>
      ))}

      {/* 创建/编辑标签对话框 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditMode ? "编辑标签" : "创建新标签"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="tag-name" className="text-sm font-medium">标签名称</label>
              <Input
                id="tag-name"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                placeholder="输入标签名称"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="tag-kind" className="text-sm font-medium">标签类型</label>
              <Select value={tagKind} onValueChange={setTagKind}>
                <SelectTrigger>
                  <SelectValue placeholder="选择标签类型" />
                </SelectTrigger>
                <SelectContent>
                  {TAG_KINDS.map(kind => (
                    <SelectItem key={kind.value} value={kind.value}>
                      {kind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="tag-color" className="text-sm font-medium">标签颜色</label>
              <div className="flex items-center gap-2">
                <Input
                  id="tag-color"
                  type="color"
                  value={tagColor}
                  onChange={(e) => setTagColor(e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setTagColor(generateRandomColor())}
                >
                  随机颜色
                </Button>
                
                <div 
                  className="ml-2 h-10 flex-1 rounded-md"
                  style={{ backgroundColor: tagColor }}
                >
                  <div 
                    className="h-full flex items-center justify-center text-white font-bold"
                  >
                    预览
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              取消
            </Button>
            <Button onClick={saveTag} disabled={!tagName.trim()}>
              <Save className="h-4 w-4 mr-1" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog 
        open={deleteTagId !== null} 
        onOpenChange={(open) => !open && setDeleteTagId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定要删除此标签吗？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。删除标签后，所有使用此标签的项目将失去此标签关联。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTag} className="bg-red-500 hover:bg-red-600">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
