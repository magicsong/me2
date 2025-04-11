export function trimLLMContentToJsonObject(content: string): string {
    // 使用正则表达式查找有效的JSON对象
    const jsonMatches = Array.from(content.matchAll(/({[\s\S]*?})/g))
        .map(match => match[0])
        .filter(jsonStr => {
            try {
                JSON.parse(jsonStr);
                return true;
            } catch (e) {
                return false;
            }
        });

    if (jsonMatches.length > 0) {
        // 返回最长的有效JSON对象
        return jsonMatches.reduce((a, b) => a.length > b.length ? a : b);
    }

    // 查找首个 { 和最后一个 } 的位置
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return content.substring(firstBrace, lastBrace + 1);
    }
    
    return content;
}

export function trimLLMContentToJsonArray(content: string): string {
    // 使用正则表达式查找有效的JSON数组
    const jsonMatches = Array.from(content.matchAll(/(\[[\s\S]*?\])/g))
        .map(match => match[0])
        .filter(jsonStr => {
            try {
                JSON.parse(jsonStr);
                return true;
            } catch (e) {
                return false;
            }
        });

    if (jsonMatches.length > 0) {
        // 返回最长的有效JSON数组
        return jsonMatches.reduce((a, b) => a.length > b.length ? a : b);
    }

    // 查找首个 [ 和最后一个 ] 的位置
    const firstBracket = content.indexOf('[');
    const lastBracket = content.lastIndexOf(']');
    
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        return content.substring(firstBracket, lastBracket + 1);
    }
    
    return content;
}

/**
 * 通用的JSON提取函数，可以提取对象或数组
 * @param content LLM生成的内容
 * @returns 提取的JSON对象或数组文本
 */
export function extractJsonFromLLMContent(content: string): string {
    try {
        // 尝试直接解析整个内容
        JSON.parse(content);
        return content;
    } catch (e) {
        // 先查找代码块中的JSON
        const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
            const blockContent = codeBlockMatch[1].trim();
            try {
                JSON.parse(blockContent);
                return blockContent;
            } catch (e) {
                // 代码块内容不是有效JSON，继续其他尝试
            }
        }
        
        // 尝试提取JSON对象
        const objectContent = trimLLMContentToJsonObject(content);
        try {
            JSON.parse(objectContent);
            return objectContent;
        } catch (e) {
            // 如果不是有效的JSON对象，尝试提取JSON数组
            const arrayContent = trimLLMContentToJsonArray(content);
            try {
                JSON.parse(arrayContent);
                return arrayContent;
            } catch (e) {
                // 都不是有效JSON，返回原始内容
                return content;
            }
        }
    }
}