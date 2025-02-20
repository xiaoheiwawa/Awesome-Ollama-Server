import { monitorServices } from '@/lib/monitor';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await monitorServices();
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Monitor service error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

// 设置 Edge Runtime 以支持较长的执行时间
export const runtime = 'edge'; 