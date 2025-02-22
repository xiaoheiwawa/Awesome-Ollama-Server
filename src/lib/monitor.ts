import { promises as fs } from 'fs';
import { join } from 'path';

interface OllamaService {
  server: string;
  models: string[];
  tps: number;
  lastUpdate: string;
}

const TEST_PROMPT = "Tell me a short joke";
const TIMEOUT_MS = 30000; // 30秒超时
const CONCURRENT_LIMIT = 50; // 并发数限制
const RESULT_FILE = join(process.cwd(), 'public', 'data.json');

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

async function readUrls(): Promise<string[]> {
  try {
    const content = await fs.readFile('url.txt', 'utf-8');
    return content.split('\n').filter(url => url.trim());
  } catch (error) {
    console.error('Error reading url.txt:', error);
    return [];
  }
}

async function checkService(url: string): Promise<string[] | null> {
  try {
    const response = await fetchWithTimeout(`${url}/api/tags`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
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

async function measureTPS(url: string, model: string): Promise<number> {
  try {
    const startTime = Date.now();
    const response = await fetchWithTimeout(`${url}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: TEST_PROMPT,
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

// 保存单个结果到文件
async function saveResult(service: OllamaService): Promise<void> {
  try {
    let results: OllamaService[] = [];
    try {
      const data = await fs.readFile(RESULT_FILE, 'utf-8');
      results = JSON.parse(data);
    } catch (error) {
      // 文件不存在或解析错误，使用空数组
      results = [];
    }

    // 更新或添加结果
    const index = results.findIndex(r => r.server === service.server);
    if (index !== -1) {
      results[index] = service;
    } else {
      results.push(service);
    }

    await fs.writeFile(RESULT_FILE, JSON.stringify(results, null, 2));
    console.log(`已保存服务结果: ${service.server}`);
  } catch (error) {
    console.error(`保存结果失败 ${service.server}:`, error);
  }
}

// 检查单个服务
async function checkSingleService(url: string): Promise<void> {
  console.log(`\n正在检查服务: ${url}`);
  
  try {
    console.log(`  - 检查模型列表...`);
    const models = await checkService(url);
    
    if (models && models.length > 0) {
      console.log(`  - 发现 ${models.length} 个模型: ${models.join(', ')}`);
      console.log(`  - 正在测试性能 (使用模型: ${models[0]})...`);
      const tps = await measureTPS(url, models[0]);
      console.log(`  - 性能测试完成: ${tps.toFixed(2)} TPS`);
      
      const service: OllamaService = {
        server: url,
        models,
        tps,
        lastUpdate: new Date().toISOString(),
      };
      
      await saveResult(service);
    } else {
      console.log(`  - 服务不可用或未发现模型`);
    }
  } catch (error) {
    console.error(`检查服务失败 ${url}:`, error);
  }
}

// 并发执行检查任务
async function runBatch(urls: string[]): Promise<void> {
  const promises = urls.map(url => checkSingleService(url));
  await Promise.all(promises);
}

export async function monitorServices(): Promise<void> {
  // 清空结果文件
  await fs.writeFile(RESULT_FILE, '[]');
  
  console.log('开始读取 URL 列表...');
  const urls = await readUrls();
  console.log(`共读取到 ${urls.length} 个服务地址`);
  
  // 将 URL 列表分成多个批次
  for (let i = 0; i < urls.length; i += CONCURRENT_LIMIT) {
    const batch = urls.slice(i, i + CONCURRENT_LIMIT);
    console.log(`\n处理批次 ${Math.floor(i / CONCURRENT_LIMIT) + 1}/${Math.ceil(urls.length / CONCURRENT_LIMIT)} (${batch.length} 个服务)`);
    await runBatch(batch);
  }

  console.log('\n所有检测任务完成');
}

export async function getData(): Promise<OllamaService[]> {
  try {
    const data = await fs.readFile(RESULT_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}
