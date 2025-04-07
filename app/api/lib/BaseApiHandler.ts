import { callLLMOnce } from '@/lib/langchain/chains';
import { BaseRequest, BaseResponse, OutputParser, PersistenceService, PromptBuilder } from './types';

/**
 * 通用API处理基类，处理创建和更新操作
 */
export abstract class BaseApiHandler<T> {
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

    /**
     * 处理创建请求
     */
    async handleCreate(request: BaseRequest<Partial<T>>): Promise<BaseResponse<T>> {
        try {
            // 处理自动生成
            if (request.autoGenerate) {
                return this.handleAutoGenerate(request);
            }

            // 处理常规创建
            if (Array.isArray(request.data)) {
                // 批量创建
                const validData = request.data.filter(item => this.validateInput(item));
                if (validData.length === 0) {
                    return { success: false, error: '没有提供有效数据' };
                }

                const createdItems = await this.persistenceService.createMany(validData as T[]);
                return { success: true, data: createdItems };
            } else {
                // 单一创建
                if (!this.validateInput(request.data)) {
                    return { success: false, error: '提供的数据无效' };
                }

                const createdItem = await this.persistenceService.create(request.data as T);
                return { success: true, data: createdItem };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '创建资源失败'
            };
        }
    }

    /**
     * 处理更新请求
     */
    async handleUpdate(request: BaseRequest<{ id: string } & Partial<T>>): Promise<BaseResponse<T>> {
        try {
            if (Array.isArray(request.data)) {
                // 批量更新
                const updateOperations = [];

                for (const item of request.data) {
                    if (!item.id) {
                        continue;
                    }

                    let dataToUpdate = item;

                    // 使用LLM增强更新数据
                    if (request.autoGenerate) {
                        const existingData = await this.getExistingData(item.id);
                        if (!existingData) {
                            continue;
                        }

                        const prompt = this.promptBuilder.buildUpdatePrompt();

                        // 使用callLLMOnce代替直接调用LLM服务
                        const llmOutput = await this.generateLLMContent(prompt, { userPrompt: request.userPrompt, ...item });
                        const enhancedData = this.outputParser.parseUpdateOutput(llmOutput, existingData);
                        dataToUpdate = { ...item, ...enhancedData };
                    }

                    updateOperations.push({
                        id: item.id,
                        data: dataToUpdate
                    });
                }

                const updatedItems = await this.persistenceService.updateMany(updateOperations);
                return { success: true, data: updatedItems };
            } else {
                // 单一更新
                const item = request.data;
                if (!item.id) {
                    return { success: false, error: '更新操作需要提供ID' };
                }

                let dataToUpdate = item;

                // 使用LLM增强更新数据
                if (request.autoGenerate) {
                    const existingData = await this.getExistingData(item.id);
                    if (!existingData) {
                        return { success: false, error: '资源未找到' };
                    }

                    const prompt = this.promptBuilder.buildUpdatePrompt();

                    // 使用callLLMOnce代替直接调用LLM服务
                    const llmOutput = await this.generateLLMContent(prompt, { userPrompt: request.userPrompt, ...item });

                    const enhancedData = this.outputParser.parseUpdateOutput(llmOutput, existingData);
                    dataToUpdate = { ...item, ...enhancedData };
                }

                const updatedItem = await this.persistenceService.update(item.id, dataToUpdate);
                return { success: true, data: updatedItem };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : '更新资源失败'
            };
        }
    }

    /**
     * 处理自动生成
     */
    private async handleAutoGenerate(request: BaseRequest<Partial<T>>): Promise<BaseResponse<T>> {
        const batchSize = request.batchSize || 1;
        const results: T[] = [];

        // 获取部分数据作为提示基础
        let partialData: Partial<T> | undefined;
        if (!Array.isArray(request.data) && request.data) {
            partialData = request.data;
        }

        // 生成指定批量大小的数据
        for (let i = 0; i < batchSize; i++) {
            try {
                const prompt = this.promptBuilder.buildCreatePrompt();

                // 使用callLLMOnce代替直接调用LLM服务
                const llmOutput = await this.generateLLMContent(prompt, { userPrompt: request.userPrompt, ...partialData });

                const generatedData = this.outputParser.parseCreateOutput(llmOutput);

                // 添加ID
                const dataWithId = { ...generatedData, id: this.generateId() };

                // 存储生成的数据
                const createdItem = await this.persistenceService.create(dataWithId as T);
                results.push(createdItem);
            } catch (error) {
                console.error('生成项目时出错:', error);
            }
        }

        return {
            success: results.length > 0,
            data: results.length === 1 ? results[0] : results,
            generatedCount: results.length,
            error: results.length === 0 ? '未能生成任何项目' : undefined
        };
    }

    /**
     * 调用LLM生成内容
     * 这里使用LangChain的chain而不是直接调用LLM
     */
    protected async generateLLMContent(prompt: string, context: any): Promise<string> {
        const cacheKey = this.resourceName() + "-" + JSON.stringify(context);
        const llmResponse = await callLLMOnce(prompt, context, cacheKey);
        return llmResponse.content as string;
    }
}
