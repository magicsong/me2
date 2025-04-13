import { callLLMOnce } from '@/lib/langchain/chains';
import { BaseRequest, BaseResponse, BusinessObject, FilterOptions, ObjectConverter, OutputParser, PatchRequest, BatchPatchRequest, BaseBatchRequest, PromptBuilder } from './types';
import { IApiHandler } from './interfaces/IApiHandler';
import { FilterCondition, PaginationOptions, PersistenceService } from '@/lib/db/intf';

/**
 * 通用API处理基类，实现IApiHandler接口
 */
export abstract class BaseApiHandler<T, BO extends BusinessObject = any> 
    implements ObjectConverter<BO, T>, IApiHandler<T, BO> {
    constructor(
        protected persistenceService: PersistenceService<T>,
        protected promptBuilder: PromptBuilder<T>,
        protected outputParser: OutputParser<T>
    ) { }
    
    // 抽象方法：验证输入
    protected abstract validateInput(data: any): boolean;

    // 抽象方法：获取已存在数据（用于更新操作）
    protected abstract getExistingData(id: string): Promise<T>;

    // 抽象方法：生成ID
    protected abstract generateId(): string;

    // 抽象方法：资源名称
    protected abstract resourceName(): string;

    // 业务对象和数据对象之间的转换抽象方法
    abstract toBusinessObject(dataObject: T): BO;
    abstract toDataObject(businessObject: BO): Partial<T>;
    abstract toBusinessObjects(dataObjects: T[]): BO[];
    abstract toDataObjects(businessObjects: BO[]): Partial<T>[];

    /**
     * 获取持久化服务实例
     * @returns 持久化服务实例
     */
    getPersistenceService(): PersistenceService<T> {
        return this.persistenceService;
    }
    
    /**
     * 获取提示构建器实例
     * @returns 提示构建器实例
     */
    getPromptBuilder(): PromptBuilder<T> {
        return this.promptBuilder;
    }
    
    /**
     * 获取输出解析器实例
     * @returns 输出解析器实例
     */
    getOutputParser(): OutputParser<T> {
        return this.outputParser;
    }

    /**
     * 处理创建请求 - 使用业务对象
     */
    async handleCreate(request: BaseRequest<BO>): Promise<BaseResponse<BO>> {
        try {
            // 处理自动生成
            if (request.autoGenerate) {
                return this.handleAutoGenerate(request);
            }

            // 单一创建
            if (!request.data || !this.validateInput(this.toDataObject(request.data))) {
                return { success: false, error: '提供的数据无效' };
            }

            const dataObject = this.toDataObject(request.data);
            const createdItem = await this.persistenceService.create(dataObject as Partial<T>);
            // 转换回业务对象返回
            return { success: true, data: this.toBusinessObject(createdItem) };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '创建资源失败'
            };
        }
    }

    /**
     * 处理更新请求 - 使用业务对象
     */
    async handleUpdate(request: BaseRequest<BO>): Promise<BaseResponse<BO>> {
        try {
            const item = request.data;
            if (!item || !item.id) {
                return { success: false, error: '更新操作需要提供ID' };
            }

            let dataToUpdate = this.toDataObject(item);

            // 使用LLM增强更新数据
            if (request.autoGenerate && request.userPrompt) {
                const existingData = await this.getExistingData(String(item.id));
                if (!existingData) {
                    return { success: false, error: '资源未找到' };
                }

                const prompt = this.promptBuilder.buildUpdatePrompt();
                const llmOutput = await this.generateLLMContent(prompt, { userPrompt: request.userPrompt, ...dataToUpdate });
                const enhancedData = this.outputParser.parseUpdateOutput(llmOutput, existingData);
                dataToUpdate = { ...dataToUpdate, ...enhancedData };
            }

            const updatedItem = await this.persistenceService.update(item.id, dataToUpdate);
            // 转换回业务对象返回
            return { success: true, data: this.toBusinessObject(updatedItem) };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '更新资源失败'
            };
        }
    }

    /**
     * 处理批量更新请求 - 允许不同的项目不同的数据
     */
    async handleBatchUpdate(request: BaseBatchRequest<BO>): Promise<BaseResponse<BO[]>> {
        try {
            if (!request.data || request.data.length === 0) {
                return { success: false, error: '批量更新需要提供数据数组' };
            }

            // 收集所有要更新的项目
            const itemsToUpdate = request.data.filter(item => item.id);
            
            if (itemsToUpdate.length === 0) {
                return { success: false, error: '没有提供有效的更新项目' };
            }
            
            // 转换为数据对象数组
            const dataObjectsToUpdate = itemsToUpdate.map(item => {
                const dataObj = this.toDataObject(item);
                // 确保ID字段存在
                dataObj.id = item.id;
                return dataObj as Partial<T>;
            });
            
            // 调用persistenceService的updateMany方法
            const updatedItems = await this.persistenceService.updateMany(dataObjectsToUpdate);
            
            // 转换回业务对象
            const businessResults = this.toBusinessObjects(updatedItems);
            
            return {
                success: businessResults.length > 0,
                data: businessResults,
                error: businessResults.length === 0 ? '未能更新任何项目' : undefined
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '批量更新资源失败'
            };
        }
    }

    /**
     * 处理部分更新请求 - 只更新指定字段
     */
    async handlePatch(request: PatchRequest<BO>): Promise<BaseResponse<BO>> {
        try {
            if (!request.id) {
                return { success: false, error: '更新操作需要提供ID' };
            }

            // 先检查资源是否存在
            const existingItem = await this.getExistingData(String(request.id));
            if (!existingItem) {
                return { success: false, error: '资源未找到' };
            }

            // 如果提供了userId限制，则验证资源归属
            if (request.userId && existingItem['userId'] !== request.userId) {
                return { success: false, error: '无权更新此资源' };
            }

            // 将业务字段转换为数据字段
            const dataFields = this.toDataObject(request.fields as any);
            
            // 更新指定字段
            const updatedItem = await this.persistenceService.update(request.id, dataFields);
            
            // 转换回业务对象
            return { success: true, data: this.toBusinessObject(updatedItem) };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '部分更新资源失败'
            };
        }
    }
    
    /**
     * 处理批量部分更新请求 - 将多个资源的相同字段更新为相同值
     */
    async handleBatchPatch(request: BatchPatchRequest<BO>): Promise<BaseResponse<BO>> {
        try {
            if (!request.id || request.id.length === 0) {
                return { success: false, error: '批量更新操作需要提供ID列表' };
            }

            // 将业务字段转换为数据字段
            const dataFields = this.toDataObject(request.fields as any);
            
            // 创建过滤条件
            const filter: FilterCondition<T> = {
                id: { in: request.id as any }
            } as FilterCondition<T>;
            
            // 如果提供了userId限制
            if (request.userId) {
                (filter as any).userId = request.userId;
            }
            
            // 使用patchMany方法批量更新
            const updatedItems = await this.persistenceService.patchMany(filter, dataFields as Partial<T>);
            
            // 转换回业务对象返回
            return { success: true, data: this.toBusinessObjects(updatedItems) };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '批量部分更新资源失败'
            };
        }
    }

    /**
     * 使用AI根据用户提示生成单个BO对象
     */
    async generateWithAI(request: BaseRequest<Partial<BO>>): Promise<BaseResponse<BO>> {
        try {
            if (!request.userPrompt) {
                return { success: false, error: 'userPrompt字段必填' };
            }

            // 获取部分数据作为提示基础
            let partialData: Partial<T> | undefined;
            if (request.data && !Array.isArray(request.data)) {
                partialData = this.toDataObject(request.data);
            }

            // 生成提示
            const prompt = this.promptBuilder.buildCreatePrompt();
            
            // 调用LLM生成内容
            const llmOutput = await this.generateLLMContent(prompt, { 
                userPrompt: request.userPrompt, 
                ...partialData 
            });
            
            // 解析生成的内容
            const generatedData = this.outputParser.parseCreateOutput(llmOutput);
            
            // 这里不保存到数据库，只返回生成的对象
            // 转换为业务对象并返回
            const businessObject = this.toBusinessObject(generatedData as T);
            
            // 确保没有ID
            delete businessObject.id;
            
            return {
                success: true,
                data: businessObject
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '使用AI生成资源失败'
            };
        }
    }
    
    /**
     * 使用AI根据用户提示批量生成多个BO对象
     */
    async generateBatchWithAI(request: BaseRequest<Partial<BO>>): Promise<BaseResponse<BO[]>> {
        try {
            if (!request.userPrompt) {
                return { success: false, error: 'userPrompt字段必填' };
            }

            const batchSize = request.batchSize || 3; // 默认生成3个
            const results: BO[] = [];

            // 获取部分数据作为提示基础
            let partialData: Partial<T> | undefined;
            if (request.data && !Array.isArray(request.data)) {
                partialData = this.toDataObject(request.data);
            }

            // 尝试使用批量生成
            if (typeof this.outputParser.parseCreateOutputArray === 'function') {
                // 生成提示
                const prompt = this.promptBuilder.buildCreatePrompt();
                
                // 添加批量生成的指示
                const batchPrompt = `${prompt}\n请生成${batchSize}个不同的对象，以JSON数组格式返回。`;
                
                // 调用LLM生成内容
                const llmOutput = await this.generateLLMContent(batchPrompt, { 
                    userPrompt: request.userPrompt, 
                    batchSize,
                    ...partialData 
                });
                
                // 解析生成的批量内容
                const generatedItems = this.outputParser.parseCreateOutputArray(llmOutput);
                
                // 转换为业务对象
                for (const item of generatedItems) {
                    const businessObject = this.toBusinessObject(item as T);
                    delete businessObject.id; // 确保没有ID
                    results.push(businessObject);
                    
                    // 如果已经生成了足够的数量，就停止
                    if (results.length >= batchSize) break;
                }
            }
            
            // 如果批量生成失败或不支持，则逐个生成
            if (results.length === 0) {
                for (let i = 0; i < batchSize; i++) {
                    // 生成提示
                    const prompt = this.promptBuilder.buildCreatePrompt();
                    
                    // 调用LLM生成内容
                    const llmOutput = await this.generateLLMContent(prompt, { 
                        userPrompt: `${request.userPrompt} (生成第${i+1}个，请确保与之前生成的不同)`, 
                        ...partialData 
                    });
                    
                    // 解析生成的内容
                    const generatedData = this.outputParser.parseCreateOutput(llmOutput);
                    
                    // 转换为业务对象
                    const businessObject = this.toBusinessObject(generatedData as T);
                    delete businessObject.id; // 确保没有ID
                    results.push(businessObject);
                }
            }
            
            return {
                success: results.length > 0,
                data: results,
                generatedCount: results.length,
                error: results.length === 0 ? '未能生成任何项目' : undefined
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '使用AI批量生成资源失败'
            };
        }
    }

    /**
     * 处理自动生成 - 使用业务对象
     */
    private async handleAutoGenerate(request: BaseRequest<BO>): Promise<BaseResponse<BO>> {
        const batchSize = request.batchSize || 1;
        const results: T[] = [];

        // 获取部分数据作为提示基础
        let partialData: Partial<T> | undefined;
        if (!Array.isArray(request.data) && request.data) {
            partialData = this.toDataObject(request.data);
        }

        // 生成指定批量大小的数据
        for (let i = 0; i < batchSize; i++) {
            try {
                const prompt = this.promptBuilder.buildCreatePrompt();
                const llmOutput = await this.generateLLMContent(prompt, { userPrompt: request.userPrompt, ...partialData });
                const generatedData = this.outputParser.parseCreateOutput(llmOutput);
                
                // 存储生成的数据
                const createdItem = await this.persistenceService.create(generatedData as T);
                results.push(createdItem);
            } catch (error) {
                console.error('生成项目时出错:', error);
            }
        }

        // 转换回业务对象
        const businessResults = this.toBusinessObjects(results);

        return {
            success: businessResults.length > 0,
            data: businessResults.length === 1 ? businessResults[0] : businessResults,
            generatedCount: businessResults.length,
            error: businessResults.length === 0 ? '未能生成任何项目' : undefined
        };
    }

    /**
     * 调用LLM生成内容
     */
    protected async generateLLMContent(prompt: string, context: any): Promise<string> {
        const cacheKey = this.resourceName() + "-" + JSON.stringify(context);
        const llmResponse = await callLLMOnce(prompt, context, cacheKey);
        return llmResponse.content as string;
    }

    /**
     * 简化版调用LLM生成内容方法，不需要指定提示
     * 会自动使用promptBuilder.build()方法获取提示
     */
    protected async generateContent(context?: any): Promise<Partial<T>> {
        try {
            // 检查promptBuilder是否实现了build方法
            if (typeof this.promptBuilder.build !== 'function') {
                throw new Error('promptBuilder未实现build方法');
            }
            
            // 检查outputParser是否实现了parse方法
            if (typeof this.outputParser.parse !== 'function') {
                throw new Error('outputParser未实现parse方法');
            }
            
            // 获取通用提示
            const prompt = this.promptBuilder.build();
            
            // 生成内容
            const cacheKey = this.resourceName() + "-zero-param-" + JSON.stringify(context || {});
            const llmResponse = await callLLMOnce(prompt, context || {}, cacheKey);
            
            // 解析内容
            return this.outputParser.parse(llmResponse.content as string);
        } catch (error) {
            console.error('生成内容失败:', error);
            throw error;
        }
    }

    /**
     * 创建处理器的静态工厂方法
     * @param options 可选的创建选项
     */
    static create<T, B extends BusinessObject>(
        options?: {
            persistenceService?: PersistenceService<T>,
            promptBuilder?: PromptBuilder<T>,
            outputParser?: OutputParser<T>
        }
    ): BaseApiHandler<T, B> {
        // 这里需要由子类实现，返回具体的处理器实例
        throw new Error('子类必须实现create方法');
    }

    /**
     * 根据ID获取单个资源
     */
    async getById(id: string): Promise<BO | null> {
        try {
            const item = await this.persistenceService.findById(id);
            return item ? this.toBusinessObject(item) : null;
        } catch (error) {
            console.error(`获取${this.resourceName()}失败:`, error);
            return null;
        }
    }

    /**
     * 获取所有资源
     * @param userId 可选的用户ID过滤
     */
    async getAll(userId?: string): Promise<BO[]> {
        try {
            let items: T[];
            if (userId && typeof this.persistenceService.getByUserId === 'function') {
                items = await this.persistenceService.getByUserId(userId);
            } else {
                items = await this.persistenceService.getAll(userId);
            }
            return this.toBusinessObjects(items);
        } catch (error) {
            console.error(`获取所有${this.resourceName()}失败:`, error);
            return [];
        }
    }

    /**
     * 分页获取资源
     * @param page 页码，从1开始
     * @param pageSize 每页大小
     * @param userId 可选的用户ID过滤
     */
    async getPage(page: number = 1, pageSize: number = 10, userId?: string): Promise<{
        items: BO[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    }> {
        try {
            // 确保页码有效
            page = Math.max(1, page);
            pageSize = Math.max(1, Math.min(100, pageSize)); // 限制每页大小

            // 创建分页选项
            const paginationOptions: PaginationOptions = {
                page,
                pageSize
            };

            // 创建过滤条件
            const filter: FilterCondition<T> = {} as FilterCondition<T>;
            if (userId) {
                (filter as any).userId = userId;
            }

            // 如果持久化服务支持分页
            if (typeof this.persistenceService.getPageWithFilters === 'function') {
                const result = await this.persistenceService.getPageWithFilters(paginationOptions, filter, userId);
                
                return {
                    items: this.toBusinessObjects(result.items),
                    total: result.total,
                    page: result.page,
                    pageSize: result.pageSize,
                    totalPages: result.totalPages
                };
            } else {
                // 降级处理：获取所有项目然后手动分页
                const items = await this.persistenceService.getAll(userId);
                
                const total = items.length;
                
                // 手动分页
                const startIndex = (page - 1) * pageSize;
                const paginatedItems = items.slice(startIndex, startIndex + pageSize);
                
                // 计算总页数
                const totalPages = Math.ceil(total / pageSize);

                // 转换为业务对象
                const boItems = this.toBusinessObjects(paginatedItems);

                return {
                    items: boItems,
                    total,
                    page,
                    pageSize,
                    totalPages
                };
            }
        } catch (error) {
            console.error(`分页获取${this.resourceName()}失败:`, error);
            return {
                items: [],
                total: 0,
                page,
                pageSize,
                totalPages: 0
            };
        }
    }

    /**
     * 使用过滤器获取资源
     * @param filters 过滤选项
     * @param userId 可选的用户ID
     */
    async getWithFilters(filters: FilterOptions, userId?: string): Promise<{
        items: BO[];
        total: number;
        metadata?: Record<string, any>;
    }> {
        try {
            // 检查持久化服务是否支持过滤查询
            if (typeof this.persistenceService.getWithFilters !== 'function') {
                throw new Error(`${this.resourceName()}持久化服务不支持过滤查询`);
            }
            
            const dbFilters = this.convertFilters(filters)
            console.log(dbFilters)
            const result = await this.persistenceService.getWithFilters(dbFilters, userId);
            
            return {
                items: this.toBusinessObjects(result.items),
                total: result.total,
                metadata: result.metadata
            };
        } catch (error) {
            console.error(`过滤查询${this.resourceName()}失败:`, error);
            return {
                items: [],
                total: 0
            };
        }
    }

    /**
     * 分页获取并过滤资源
     * @param filters 过滤选项
     * @param page 页码，从1开始
     * @param pageSize 每页大小
     * @param userId 可选的用户ID
     */
    async getPageWithFilters(
        filters: FilterOptions,
        page: number = 1,
        pageSize: number = 10,
        userId?: string
    ): Promise<{
        items: BO[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        metadata?: Record<string, any>;
    }> {
        try {
            // 确保页码有效
            page = Math.max(1, page);
            pageSize = Math.max(1, Math.min(100, pageSize));

            // 创建分页选项
            const paginationOptions: PaginationOptions = {
                page,
                pageSize,
                sortBy: filters.sortBy,
                sortOrder: filters.sortDirection
            };
            
            // 转换为持久层的过滤条件
            const filterCondition: FilterCondition<T> = this.convertFilters(filters);
            console.log(filterCondition)
            // 如果提供了userId，添加到过滤条件
            if (userId) {
                (filterCondition as any).userId = userId;
            }

            // 检查持久化服务是否支持分页过滤查询
            if (typeof this.persistenceService.getPageWithFilters === 'function') {
                const result = await this.persistenceService.getPageWithFilters(
                    paginationOptions, filterCondition, userId
                );
                
                return {
                    items: this.toBusinessObjects(result.items),
                    total: result.total,
                    page: result.page,
                    pageSize: result.pageSize,
                    totalPages: result.totalPages,
                    metadata: result.metadata
                };
            }
            
            // 如果两种过滤方法都不支持，则抛出错误
            throw new Error(`${this.resourceName()}持久化服务不支持过滤查询`);
        } catch (error) {
            console.error(`分页过滤查询${this.resourceName()}失败:`, error);
            return {
                items: [],
                total: 0,
                page,
                pageSize,
                totalPages: 0
            };
        }
    }
    
    /**
     * 转换API过滤条件为持久层过滤条件
     * @param filters API过滤选项
     * @returns 持久层过滤条件
     */
    protected convertFilters(filters: FilterOptions): FilterCondition<T> {
        const result: FilterCondition<T> = {} as FilterCondition<T>;
        if (filters.conditions && filters.conditions.length > 0) {
            for (const condition of filters.conditions) {
                // 处理eq操作符，这会覆盖之前的任何条件
                if (condition.operator === 'eq') {
                    result[condition.field] = condition.value;
                    continue;
                }
                
                // 处理其他操作符
                // 如果字段尚未初始化或不是对象，需要初始化为对象
                if (!result[condition.field] || typeof result[condition.field] !== 'object') {
                    // 如果已经有值，它是一个简单值（eq操作符的结果），记录警告
                    if (result[condition.field] !== undefined) {
                        console.warn(`字段 ${condition.field} 已有等于条件，添加 ${condition.operator} 条件可能导致意外结果`);
                    }
                    result[condition.field] = {};
                }
                
                // 根据操作符设置条件
                switch (condition.operator) {
                    case 'neq':
                        result[condition.field].ne = condition.value;
                        break;
                    case 'gt':
                        result[condition.field].gt = condition.value;
                        break;
                    case 'gte':
                        result[condition.field].gte = condition.value;
                        break;
                    case 'lt':
                        result[condition.field].lt = condition.value;
                        break;
                    case 'lte':
                        result[condition.field].lte = condition.value;
                        break;
                    case 'like':
                        result[condition.field].like = condition.value;
                        break;
                    case 'in':
                        result[condition.field].in = condition.value;
                        break;
                }
            }
        }
        
        return result;
    }
}
