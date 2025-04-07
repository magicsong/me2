import 'server-only';


import { findLLMCachedResponse, saveLLMRecordToDB } from "@/lib/persist/llm";
import { load } from "@langchain/core/load";
import { createHash } from "crypto";
import { getCurrentUserId } from '../utils';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from "@langchain/core/runnables";
import { chatModel } from '.';
import { AIMessageChunk } from '@langchain/core/messages';

// createCacheChain 函数用于调用LLM链，并在缓存中查找结果，不会有多轮对话
export const createCacheChain = async <T>(chainFunc: () => Promise<T>, cacheKey: string, cacheTime: number = 60): Promise<T> => {
  // 生成缓存键
  const requestHash = createHash('md5').update(cacheKey).digest('hex');

  // 检查缓存
  const cachedResult = await findLLMCachedResponse(requestHash, cacheTime);
  if (cachedResult) {
    return load(cachedResult.response_content);
  }

  // 执行链
  const result = await chainFunc();
  console.log("langchain:", result);
  // 保存结果到缓存
  const userId = await getCurrentUserId();
  await saveLLMRecordToDB(
    requestHash,
    cacheKey,
    "langchain",
    JSON.stringify(result),
    undefined,
    userId
  );
  return result;
};

export const callLLMOnce = async function (promptTemplate: string, context: any, cacheKey: string): Promise<AIMessageChunk> {

  const chain = RunnableSequence.from([
    PromptTemplate.fromTemplate(promptTemplate),
    chatModel,
  ]);
  const result = await createCacheChain(
    () => chain.invoke(context),
    cacheKey,
    240 // 缓存4小时
  );
  // 返回消息的content字段
  return result as AIMessageChunk;
};