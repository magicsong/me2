// 标签业务对象
export interface TagBO {
  id: number;
  name: string;
  color: string;
  kind?: string;
  userId: string;
  createdAt?: string;
}