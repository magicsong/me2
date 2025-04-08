import { callLLMOnce } from '@/lib/langchain/chains';
import { BaseRequest, BaseResponse, BusinessObject, ObjectConverter, OutputParser, PersistenceService, PromptBuilder } from './types';

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
                const updateOperations = [];

                for (const item of request.data) {
                    if (!item.id) {
                        continue;
                    }

                    let dataToUpdate = this.toDataObject(item);

                    // 使用LLM增强更新数据
                    if (request.autoGenerate) {
                        const existingData = await this.getExistingData(String(item.id));
                        if (!existingData) {
                            continue;
                        }

                        const prompt = this.promptBuilder.buildUpdatePrompt();
                        const llmOutput = await this.generateLLMContent(prompt, { userPrompt: request.userPrompt, ...dataToUpdate });
                        const enhancedData = this.outputParser.parseUpdateOutput(llmOutput, existingData);
                        dataToUpdate = { ...dataToUpdate, ...enhancedData };
                    }

                    updateOperations.push({
                        id: item.id,
                        data: dataToUpdate
                    });
                }

                const updatedItems = await this.persistenceService.updateMany(updateOperations);
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
}
