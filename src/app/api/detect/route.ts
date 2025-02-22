import { NextResponse } from 'next/server';
import { checkService, measureTPS } from '@/lib/detect';

export async function POST(request: Request) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400, headers });
    }

    console.log('Checking service:', url);

    // 检查服务并获取可用模型
    const models = await checkService(url);
    
    console.log('Models:', models);

    // 如果 models 是 null，表示服务不可访问
    if (models === null) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 404, headers });
    }

    // 如果 models 是空数组，返回成功但没有模型的响应
    if (models.length === 0) {
      return NextResponse.json({
        server: url,
        models: [],
        tps: 0,
        lastUpdate: new Date().toISOString(),
      }, { headers });
    }

    // 测试性能
    const tps = await measureTPS(url, models[0]);

    console.log('TPS:', tps);

    // 返回结果
    return NextResponse.json({
      server: url,
      models,
      tps,
      lastUpdate: new Date().toISOString(),
    }, { headers });
  } catch (error) {
    console.error('Detection error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 移除 edge runtime 配置，因为我们不再需要它
// export const runtime = 'edge'; 