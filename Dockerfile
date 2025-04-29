# 使用Node.js官方镜像作为基础镜像
FROM node:20-alpine AS base

# 设置工作目录
WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 安装依赖
COPY package.json package-lock.json* ./
RUN npm ci

# 复制所有文件
COPY . .

# 生成环境变量文件（如果不存在）
RUN [ -f .env ] || cp .env.example .env

# 构建应用
RUN npm run build

# 生产环境
FROM node:20-alpine AS production

WORKDIR /app

# 复制依赖和构建文件
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/.env ./.env
COPY --from=base /app/next.config.ts ./next.config.ts
COPY --from=base /app/scripts ./scripts

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]