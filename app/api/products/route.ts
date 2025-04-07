import { NextRequest, NextResponse } from 'next/server';
import { BaseApiHandler } from '../lib/BaseApiHandler';
import { PersistenceService, PromptBuilder, OutputParser } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

// 定义产品类型
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

// 产品提示构建器
class ProductPromptBuilder implements PromptBuilder<Product> {
  buildCreatePrompt(partialData?: Partial<Product>): string {
    let prompt = "生成一个具有以下JSON结构的产品:\n";
    prompt += "{\n  \"name\": \"产品名称\",\n  \"description\": \"产品描述\",\n";
    prompt += "  \"price\": 99.99,\n  \"category\": \"类别名称\",\n  \"inStock\": true\n}";
    
    if (partialData) {
      prompt += "\n\n请在你的回复中包含以下详细信息:";
      Object.entries(partialData).forEach(([key, value]) => {
        if (key !== 'id') {
          prompt += `\n- ${key}: ${value}`;
        }
      });
    }
    
    return prompt;
  }
  
  buildUpdatePrompt(existingData: Product, partialData: Partial<Product>): string {
    let prompt = `更新以下产品:\n${JSON.stringify(existingData, null, 2)}\n\n`;
    
    prompt += "使用这些变更:\n";
    Object.entries(partialData).forEach(([key, value]) => {
      if (key !== 'id') {
        prompt += `- ${key}: ${value}\n`;
      }
    });
    
    prompt += "\n请回复完整的更新后的产品JSON。";
    return prompt;
  }
}

// 产品输出解析器
class ProductOutputParser implements OutputParser<Product> {
  parseCreateOutput(output: string): Product {
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("输出中未找到有效的JSON");
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        id: "", // ID将由处理器添加
        name: parsed.name || "未命名产品",
        description: parsed.description || "",
        price: typeof parsed.price === 'number' ? parsed.price : 0,
        category: parsed.category || "未分类",
        inStock: parsed.inStock === undefined ? true : !!parsed.inStock
      };
    } catch (error) {
      console.error("解析LLM输出错误:", error);
      throw new Error("解析LLM输出失败");
    }
  }
  
  parseUpdateOutput(output: string, existingData: Product): Product {
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return existingData;
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...existingData,
        name: parsed.name || existingData.name,
        description: parsed.description || existingData.description,
        price: typeof parsed.price === 'number' ? parsed.price : existingData.price,
        category: parsed.category || existingData.category,
        inStock: parsed.inStock === undefined ? existingData.inStock : !!parsed.inStock
      };
    } catch (error) {
      console.error("解析LLM更新输出错误:", error);
      return existingData;
    }
  }
}

// 示例持久化服务
class ProductPersistenceService implements PersistenceService<Product> {
  // 这里应该实现真实的数据库连接
  // 仅用于示例
  private products: Map<string, Product> = new Map();
  
  async create(data: Product): Promise<Product> {
    this.products.set(data.id, data);
    return data;
  }
  
  async createMany(data: Product[]): Promise<Product[]> {
    data.forEach(product => this.products.set(product.id, product));
    return data;
  }
  
  async update(id: string, data: Partial<Product>): Promise<Product> {
    const product = this.products.get(id);
    if (!product) {
      throw new Error(`产品ID ${id}不存在`);
    }
    
    const updated = { ...product, ...data };
    this.products.set(id, updated);
    return updated;
  }
  
  async updateMany(items: Array<{id: string, data: Partial<Product>}>): Promise<Product[]> {
    const results: Product[] = [];
    
    for (const item of items) {
      const updated = await this.update(item.id, item.data);
      results.push(updated);
    }
    
    return results;
  }
}

// 产品API处理器
class ProductApiHandler extends BaseApiHandler<Product> {
  constructor(persistenceService: PersistenceService<Product>) {
    super(
      persistenceService,
      new ProductPromptBuilder(),
      new ProductOutputParser()
    );
  }
  
  protected validateInput(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      (data.name || data.description || data.price !== undefined || 
       data.category !== undefined || data.inStock !== undefined)
    );
  }
  
  protected async getExistingData(id: string): Promise<Product> {
    const product = await (this.persistenceService as ProductPersistenceService)
      .update(id, {}); // 利用update方法获取现有数据
    return product;
  }
  
  protected generateId(): string {
    return uuidv4();
  }
}

// 创建服务实例 - 注意没有使用LLMService
const persistenceService = new ProductPersistenceService();
const productHandler = new ProductApiHandler(persistenceService);

// API路由处理器
export async function POST(req: NextRequest) {
  const requestData = await req.json();
  const response = await productHandler.handleCreate(requestData);
  
  return NextResponse.json(response, {
    status: response.success ? 201 : 400
  });
}

export async function PUT(req: NextRequest) {
  const requestData = await req.json();
  const response = await productHandler.handleUpdate(requestData);
  
  return NextResponse.json(response, {
    status: response.success ? 200 : response.error === '资源未找到' ? 404 : 400
  });
}
