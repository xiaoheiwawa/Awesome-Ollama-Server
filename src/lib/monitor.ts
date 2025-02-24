import { Redis } from '@upstash/redis'
import { promises as fs } from 'fs'
import { join } from 'path'
import { OllamaService } from '../types'
require('dotenv').config({ path: '.env.local' })

const TEST_PROMPT = "Tell me a short joke"
const TIMEOUT_MS = 30000 // 30秒超时
const CONCURRENT_LIMIT = 50 // 并发数限制
const RESULT_FILE = join(process.cwd(), 'public', 'data.json')
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

// 创建带超时的 fetch 函数
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// 从 url.txt 文件中读取 URL 列表
async function readUrls(): Promise<string[]> {
  try {
    const content = await fs.readFile('url.txt', 'utf-8')
    return content.split('\n').filter(url => url.trim())
  } catch (error) {
    console.error('Error reading url.txt:', error)
    return []
  }
}

// 检查服务是否可用
async function checkService(url: string): Promise<string[] | null> {
  try {
    const response = await fetchWithTimeout(`${url}/api/tags`, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.models?.map((model: any) => model.name) || []
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`检查服务超时 ${url}`)
    } else {
      console.error(`检查服务出错 ${url}:`, error)
    }
    return null
  }
}

// 测量TPS
async function measureTPS(url: string, model: string): Promise<number> {
  try {
    const startTime = Date.now()
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
    })

    if (!response.ok) {
      return 0
    }

    await response.json()
    const endTime = Date.now()
    const timeInSeconds = (endTime - startTime) / 1000
    return timeInSeconds > 0 ? 1 / timeInSeconds : 0
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`性能测试超时 ${url}`)
    } else {
      console.error(`性能测试出错 ${url}:`, error)
    }
    return 0
  }
}

// 保存单个结果到文件
async function saveResult(service: OllamaService): Promise<void> {
  try {
    let results: OllamaService[] = []
    try {
      const data = await fs.readFile(RESULT_FILE, 'utf-8')
      results = JSON.parse(data)
    } catch (error) {
      // 文件不存在或解析错误，使用空数组
      results = []
    }

    // 更新或添加结果
    const index = results.findIndex(r => r.server === service.server)
    if (index !== -1) {
      results[index] = service
    } else {
      results.push(service)
    }

    await fs.writeFile(RESULT_FILE, JSON.stringify(results, null, 2))
    console.log(`已保存服务结果: ${service.server}`)
  } catch (error) {
    console.error(`保存结果失败 ${service.server}:`, error)
  }
}

// 检查单个服务
async function checkSingleService(url: string): Promise<OllamaService | null> {
  console.log(`\n正在检查服务: ${url}`)
  
  try {
    const models = await checkService(url)
    
    if (models && models.length > 0) {
      const tps = await measureTPS(url, models[0])
      
      return {
        server: url,
        models,
        tps,
        lastUpdate: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error(`检查服务失败 ${url}:`, error)
  }
  
  return null
}

// 并发执行检查任务
async function runBatch(urls: string[]): Promise<OllamaService[]> {
  const results: OllamaService[] = []
  const promises = urls.map(async url => {
    const service = await checkSingleService(url)
    if (service) {
      results.push(service)
    }
  })
  await Promise.all(promises)
  return results
}

// 主函数
async function main() {
  try {
    console.log('开始更新服务...')

    // 1. 从 Redis 的 Set 中读取服务器列表
    const encodedUrls = await redis.smembers('ollama:servers')
    const urls = encodedUrls.map(url => decodeURIComponent(url))

    console.log(`从 Redis 读取到 ${urls.length} 个服务器`)

    // 2. 清空结果文件
    await fs.writeFile(RESULT_FILE, '[]')

    // 有效服务器列表
    const validServers = new Set<string>()

    // 3. 分批处理服务器
    for (let i = 0; i < urls.length; i += CONCURRENT_LIMIT) {
      const batch = urls.slice(i, i + CONCURRENT_LIMIT)
      console.log(`\n处理批次 ${Math.floor(i / CONCURRENT_LIMIT) + 1}/${Math.ceil(urls.length / CONCURRENT_LIMIT)} (${batch.length} 个服务)`)
      
      const results = await runBatch(batch)
      
      // 记录有效的服务器
      results.forEach(result => {
        if (result.models && result.models.length > 0) {
          validServers.add(encodeURIComponent(result.server)) // 注意这里需要编码
        }
      })
    }

    // 4. 更新 Redis 中的有效服务器列表
    await redis.del('ollama:servers')
    if (validServers.size > 0) {
      await redis.sadd('ollama:servers', Array.from(validServers))
    }

    console.log(`\n更新完成，共有 ${validServers.size} 个有效服务器`)

  } catch (error) {
    console.error('更新服务失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此文件则执行主函数
if (require.main === module) {
  main()
}
