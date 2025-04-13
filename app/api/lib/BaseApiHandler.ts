import { callLLMOnce } from '@/lib/langchain/chains';
import { BaseRequest, BaseResponse, BusinessObject, FilterOptions, ObjectConverter, OutputParser, PersistenceService, PromptBuilder } from './types';

/**
 * 通用API处理基类，处理创建和更新操作
 */
export abstract class BaseApiHandler<T, BO extends BusinessObject = any> implements ObjectConverter<BO, T> {
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
     * 处理创建请求 - 使用业务对象
     */
    async handleCreate(request: BaseRequest<BO>): Promise<BaseResponse<BO>> {
        try {
            // 处理自动生成
            if (request.autoGenerate) {
                return this.handleAutoGenerate(request);
            }

            // 处理常规创建
            if (Array.isArray(request.data)) {
                // 批量创建 - 先转换为数据对象
                const dataObjects = this.toDataObjects(request.data);
                const validData = dataObjects.filter(item => this.validateInput(item));
                
                if (validData.length === 0) {
                    return { success: false, error: '没有提供有效数据' };
                }

                const createdItems = await this.persistenceService.createMany(validData as T[]);
                // 转换回业务对象返回
                return { success: true, data: this.toBusinessObjects(createdItems) };
            } else {
                // 单一创建
                if (!request.data || !this.validateInput(this.toDataObject(request.data))) {
                    return { success: false, error: '提供的数据无效' };
                }

                const dataObject = this.toDataObject(request.data);
                const createdItem = await this.persistenceService.create(dataObject as T);
                // 转换回业务对象返回
                return { success: true, data: this.toBusinessObject(createdItem) };
            }
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
            if (Array.isArray(request.data)) {
                // 批量更新
                // 收集所有要更新的ID
                const itemIds = request.data.filter(item => item.id).map(item => item.id);
                
                if (itemIds.length === 0) {
                    return { success: false, error: '没有提供有效的ID' };
                }
                
                // 创建一个包含所有要更新的字段的数据对象
                // 注意：所有项目都将更新为相同的数据
                let dataToUpdate = {};
                
                // 合并所有项目的共同字段
                for (const item of request.data) {
                    if (item.id) {
                        const itemData = this.toDataObject(item);
                        // 排除id字段
                        delete itemData.id;
                        dataToUpdate = { ...dataToUpdate, ...itemData };
                    }
                }
                
                // 如果启用了自动生成，则用LLM增强数据
                if (request.autoGenerate && request.userPrompt) {
                    try {
                        const prompt = this.promptBuilder.buildUpdatePrompt();
                        const llmOutput = await this.generateLLMContent(prompt, { userPrompt: request.userPrompt, ...dataToUpdate });
                        const enhancedData = this.outputParser.parseUpdateOutput(llmOutput, dataToUpdate as T);
                        dataToUpdate = { ...dataToUpdate, ...enhancedData };
                    } catch (error) {
                        console.error('使用LLM增强数据失败:', error);
                    }
                }
                
                // 使用in操作符批量更新所有项目为相同的数据
                const filter = { id: { in: itemIds } };
                const updatedItems = await this.persistenceService.updateMany(filter, dataToUpdate as Partial<T>);
                
                // 转换回业务对象返回
                return { success: true, data: this.toBusinessObjects(updatedItems) };
            } else {
                // 单一更新
                const item = request.data;
                if (!item || !item.id) {
                    return { success: false, error: '更新操作需要提供ID' };
                }

                let dataToUpdate = this.toDataObject(item);

                // 使用LLM增强更新数据
                if (request.autoGenerate) {
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
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '更新资源失败'
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
            const item = await this.getExistingData(id);
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

            // 获取总数量
            let total = 0;
            let items: T[] = [];

            // 如果持久化服务支持分页
            if (typeof this.persistenceService.getPage === 'function') {
                const result = await this.persistenceService.getPage(page, pageSize, userId);
                items = result.items;
                total = result.total;
            } else {
                // 降级处理：获取所有项目然后手动分页
                items = userId && typeof this.persistenceService.getByUserId === 'function'
                    ? await this.persistenceService.getByUserId(userId)
                    : await this.persistenceService.getAll(userId);
                
                total = items.length;
                
                // 手动分页
                const startIndex = (page - 1) * pageSize;
                items = items.slice(startIndex, startIndex + pageSize);
            }

            // 计算总页数
            const totalPages = Math.ceil(total / pageSize);

            // 转换为业务对象
            const boItems = this.toBusinessObjects(items);

            return {
                items: boItems,
                total,
                page,
                pageSize,
                totalPages
            };
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

            const result = await this.persistenceService.getWithFilters(filters, userId);
            
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
     * @param page 页码，从1开始
     * @param pageSize 每页大小
     * @param filters 过滤选项
     * @param userId 可选的用户ID
     */
    async getPageWithFilters(
        page: number = 1,
        pageSize: number = 10,
        filters: FilterOptions,
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

            // 检查持久化服务是否支持分页过滤查询
            if (typeof this.persistenceService.getPageWithFilters === 'function') {
                const result = await this.persistenceService.getPageWithFilters(
                    page, pageSize, filters, userId
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
            
            // 降级处理：使用不分页的过滤查询然后手动分页
            if (typeof this.persistenceService.getWithFilters === 'function') {
                const result = await this.persistenceService.getWithFilters(filters, userId);
                const total = result.total;
                const totalPages = Math.ceil(total / pageSize);
                
                // 手动应用分页
                const startIndex = (page - 1) * pageSize;
                const paginatedItems = result.items.slice(startIndex, startIndex + pageSize);
                
                return {
                    items: this.toBusinessObjects(paginatedItems),
                    total,
                    page,
                    pageSize,
                    totalPages,
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
}
