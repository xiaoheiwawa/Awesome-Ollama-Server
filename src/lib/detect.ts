import {
  TIMEOUT_MS,
  TEST_PROMPTS,
  ModelInfo,
  fetchWithTimeout,
  checkService as checkServiceUtil,
  isFakeOllama,
  estimateTokens,
  generateRequestBody,
  calculateTPS
} from './ollama-utils';

const TEST_ROUNDS = 3; // 测试轮数

// 导出 checkService 函数
export const checkService = checkServiceUtil;

// 测量服务性能
export async function measureTPS(url: string, model: ModelInfo): Promise<number | { isFake: true }> {
  try {
    let totalTokens = 0;
    let totalTime = 0;
    let isFake = false;

    // 多轮测试
    for (let i = 0; i < TEST_ROUNDS; i++) {
      const prompt = TEST_PROMPTS[i % TEST_PROMPTS.length];

      const response = await fetchWithTimeout(`${url}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generateRequestBody(model.name, prompt, false)),
      });

      if (!response.ok) {
        console.error(`第 ${i + 1} 轮测试失败:`, await response.text());
        continue;
      }

      const data = await response.json();

      // 检查是否为 fake-ollama
      if (isFakeOllama(data.response)) {
        console.log(`检测到 fake-ollama: ${url}`);
        isFake = true;
        break;
      }

      // 使用 API 返回的 eval_count 和 eval_duration 计算 TPS
      if (data.eval_count && data.eval_duration) {
        const roundTps = calculateTPS(data);
        totalTokens += data.eval_count;
        totalTime += data.eval_duration / 1e9; // 转换为秒
      } else {
        // 如果 API 没有返回这些字段，则使用估算方法
        const inputTokens = estimateTokens(prompt);
        const outputTokens = estimateTokens(data.response);
        const timeInSeconds = data.total_duration ? data.total_duration / 1e9 : 1; // 如果有 total_duration 则使用它
        
        totalTokens += (inputTokens + outputTokens);
        totalTime += timeInSeconds;
      }

      // 等待一小段时间再进行下一轮测试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 如果是假的，返回特殊标记
    if (isFake) {
      return { isFake: true };
    }

    // 计算平均 TPS
    return totalTime > 0 ? totalTokens / totalTime : 0;
  } catch (error) {
    console.error('测量 TPS 失败:', error);
    return 0;
  }
} 