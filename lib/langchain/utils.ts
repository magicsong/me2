export function trimLLMContentToJsonObject(content: string): string {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return jsonMatch[0];
    }
    return content;
}

export function trimLLMContentToJsonArray(content: string): string {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
        return jsonMatch[0];
    }
    return content;
}