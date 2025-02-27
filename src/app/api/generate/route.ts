import { NextResponse } from 'next/server';

export const maxDuration = 50; // 设置最大执行时间为 50 秒

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const { server, model, prompt } = await request.json();

  try {
    const response = await fetch(`${server}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
        }
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Generation failed' }, { status: response.status });
    }

    // 创建转换流来处理数据
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        try {
          // 将二进制数据转换为文本
          const text = new TextDecoder().decode(chunk);
          // 分割成行并过滤掉空行
          const lines = text.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              // 尝试解析每一行 JSON
              const data = JSON.parse(line.replace(/^data: /, ''));
              // 只处理包含 response 的数据
              if (data.response) {
                controller.enqueue(encoder.encode(data.response));
              }
              // 如果是最后一条消息，可以处理其他信息
              if (data.done) {
                break;
              }
            } catch (e) {
              // 如果解析失败，尝试直接发送内容
              if (line.includes('response')) {
                const match = line.match(/"response":"([^"]*?)"/);
                if (match && match[1]) {
                  controller.enqueue(encoder.encode(match[1]));
                }
              }
              console.error('处理数据块错误:', e);
              continue;
            }
          }
        } catch (error) {
          console.error('处理数据块错误:', error);
        }
      }
    });

    // 将响应通过转换流处理
    const readableStream = response.body?.pipeThrough(transformStream);
    if (!readableStream) {
      return NextResponse.json({ error: 'No response body' }, { status: 500 });
    }

    return new Response(readableStream);
  } catch (error) {
    console.error('生成错误:', error);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
} 