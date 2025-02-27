const TIMEOUT_MS = 30000; // 30秒超时
const TEST_ROUNDS = 3; // 测试轮数
const TEST_PROMPTS = [
  "Tell me a short story about a robot who learns to love.",
  "Explain the concept of recursion in programming.",
  "What are the main differences between classical and quantum computing?"
];

// 创建带超时的 fetch 函数
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 定义模型信息的接口
interface ModelInfo {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

// 检查服务可用性并获取模型列表
export async function checkService(url: string): Promise<ModelInfo[] | null> {
  try {
    const response = await fetchWithTimeout(`${url}/api/tags`, {
      method: 'GET',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('检查服务失败:', error);
    return null;
  }
}

// 估算文本的 token 数量
function estimateTokens(text: string): number {
  // 这是一个简单的估算，实际的 token 数量可能会有所不同
  // 1. 按空格分词
  const words = text.split(/\s+/);
  // 2. 考虑标点符号
  const punctuation = text.match(/[.,!?;:'"()\[\]{}]/g)?.length || 0;
  // 3. 考虑数字
  const numbers = text.match(/\d+/g)?.length || 0;
  
  return words.length + punctuation + numbers;
}

// 测量服务性能
export async function measureTPS(url: string, model: ModelInfo): Promise<number> {
  try {
    let totalTokens = 0;
    let totalTime = 0;

    // 多轮测试
    for (let i = 0; i < TEST_ROUNDS; i++) {
      const prompt = TEST_PROMPTS[i % TEST_PROMPTS.length];
      const startTime = Date.now();

      const response = await fetchWithTimeout(`${url}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model.name,
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
          }
        }),
      });

      if (!response.ok) {
        console.error(`第 ${i + 1} 轮测试失败:`, await response.text());
        continue;
      }

      const data = await response.json();
      const endTime = Date.now();
      const timeInSeconds = (endTime - startTime) / 1000;

      // 估算 tokens
      const inputTokens = estimateTokens(prompt);
      const outputTokens = estimateTokens(data.response);
      
      totalTokens += (inputTokens + outputTokens);
      totalTime += timeInSeconds;

      // 等待一小段时间再进行下一轮测试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 计算平均 TPS
    return totalTime > 0 ? totalTokens / totalTime : 0;
  } catch (error) {
    console.error('测量 TPS 失败:', error);
    return 0;
  }
} 