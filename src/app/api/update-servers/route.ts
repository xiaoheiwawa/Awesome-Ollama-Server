import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export async function POST(request: Request) {
  try {
    const { server } = await request.json()
    const encodedServer = encodeURIComponent(server)
    await redis.sadd('ollama:servers', encodedServer)
    console.log(`已更新服务器列表: ${server}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('更新服务器列表失败:', error)
    return NextResponse.json({ error: 'Failed to update servers' }, { status: 500 })
  }
}
