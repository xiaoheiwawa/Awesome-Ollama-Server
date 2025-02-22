const TIMEOUT_MS = 30000; // 30秒超时

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

export async function checkService(url: string): Promise<string[] | null> {
  try {
    const response = await fetchWithTimeout(`${url}/api/tags`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`服务响应错误 ${url}, 状态码:`, response.status);
      return null;
    }

    const data = await response.json();
    
    // 添加调试日志
    console.log(`服务 ${url} 返回数据:`, data);

    // 检查 models 是否存在且不为空
    if (!data.models || !Array.isArray(data.models) || data.models.length === 0) {
      console.log(`服务 ${url} 没有可用模型`);
      return [];
    }

    return data.models?.map((model: any) => model.name) || [];
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`检查服务超时 ${url}`);
    } else {
      console.error(`检查服务出错 ${url}:`, error);
    }
    return null;
  }
}

export async function measureTPS(url: string, model: string): Promise<number> {
  try {
    const startTime = Date.now();
    const response = await fetchWithTimeout(`${url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: "Tell me a short joke",
        stream: false,
      }),
    });

    if (!response.ok) {
      return 0;
    }

    await response.json();
    const endTime = Date.now();
    const timeInSeconds = (endTime - startTime) / 1000;
    return timeInSeconds > 0 ? 1 / timeInSeconds : 0;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`性能测试超时 ${url}`);
    } else {
      console.error(`性能测试出错 ${url}:`, error);
    }
    return 0;
  }
} 