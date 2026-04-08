# hidong_2048

一个围绕“嗨咚豆豆英雄收集”改造的 2048 网页小游戏。

线上地址：
- https://hidong-2048.pages.dev

GitHub 仓库：
- https://github.com/zzcreation/hidong_2048

## 特点
- 保留经典 2048 合并规则
- 四位英雄可分别配置目标值：`128 / 256 / 512`
- 合成到目标值时生成英雄 tile
- 英雄 tile 不再继续合并，但会随棋盘移动
- 同一局集齐四位不同英雄即可通关
- 同时适配桌面端与移动端布局

## 核心规则
### 英雄生成
- 每个英雄都有独立目标值
- 当普通数字方块合并到某个目标值时，会生成对应英雄
- 如果多个英雄使用同一目标值，则按“该目标值下尚未收集的英雄”顺序生成
- 当该目标值对应英雄都已收集完成后，再合成该值时，只保留为普通数字方块

### 英雄 tile 行为
- 英雄 tile 不参与继续合并
- 英雄 tile 会占格
- 英雄 tile 会被棋盘整体推动移动

## 技术栈
- React
- TypeScript
- Vite
- Cloudflare Pages

## 本地运行
```bash
npm install
npm run dev
```

## 本地构建
```bash
npm run build
```

## 部署
当前通过 Cloudflare Pages 部署。

手动部署命令：
```bash
npm run build
npx wrangler pages deploy ./dist --project-name=hidong-2048 --branch=main
```

更多细节见：
- `deploy.md`
- `prd/hidong_2048_prd.md`

## 项目结构
```text
src/
  App.tsx
  config.ts
  game.ts
  index.css
  main.tsx
  types.ts
```

## 说明
本项目当前已经完成：
- 独立本地 git 仓库初始化
- GitHub 远程仓库创建并推送
- Cloudflare Pages 正式部署
