import * as cron from 'node-cron';
import { monitorServices } from '../lib/monitor';

// 检查命令行参数
const runOnce = process.argv.includes('--once');

if (runOnce) {
  // 单次运行模式
  console.log('开始执行单次监控任务...');
  monitorServices()
    .then(() => {
      console.log('单次监控任务完成，程序退出');
      process.exit(0);
    })
    .catch(error => {
      console.error('监控任务失败:', error);
      process.exit(1);
    });
} else {
  // 定时任务模式
  console.log('启动定时监控任务（每20分钟执行一次）...');
  console.log('按 Ctrl+C 可以停止程序');
  
  // 立即执行一次
  monitorServices().catch(error => {
    console.error('监控任务失败:', error);
  });

  // 然后每20分钟执行一次
  cron.schedule('*/20 * * * *', async () => {
    console.log('开始执行监控任务:', new Date().toISOString());
    try {
      await monitorServices();
      console.log('监控任务完成:', new Date().toISOString());
    } catch (error) {
      console.error('监控任务失败:', error);
    }
  });
} 