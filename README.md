# Ollama 服务监控系统

这是一个用于监控 Ollama 服务可用性和性能的系统。它包含后端定时检测和前端展示页面。

## 功能特点

- 自动检测 Ollama 服务可用性
- 测试服务性能（TPS）
- 展示可用模型列表
- 实时数据刷新
- 美观的响应式界面

## 技术栈

- Next.js
- TypeScript
- Tailwind CSS
- Node-cron

## 安装

```bash
# 克隆项目
git clone [repository-url]
cd ollama-monitor-service

# 安装依赖
npm install
```

## 配置

1. 在项目根目录创建 `url.txt` 文件
2. 每行添加一个 Ollama 服务的 URL，例如：
   ```
   http://localhost:11434
   http://192.168.1.100:11434
   ```

## 运行

### 开发环境

```bash
# 启动开发服务器
npm run dev

# 在另一个终端启动定时任务
npx tsx src/scripts/cron.ts
```

### 生产环境

```bash
# 构建项目
npm run build

# 启动服务
npm start

# 启动定时任务
npx tsx src/scripts/cron.ts
```

## 使用说明

1. 访问 `http://localhost:3000` 查看监控界面
2. 界面会显示所有可用的 Ollama 服务
3. 每个服务卡片包含：
   - 服务地址（可点击）
   - 可用模型列表
   - TPS（每秒事务数）
   - 最后更新时间
4. 点击"刷新数据"按钮手动更新数据（每分钟限制一次）

## 自动更新

系统会每 20 分钟自动检测一次所有服务的状态。你可以在 `src/scripts/cron.ts` 中修改检测频率。

## 注意事项

1. 确保 `url.txt` 中的服务地址格式正确
2. 服务需要支持 CORS 请求
3. 如果使用 HTTPS，需要确保证书有效

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT
