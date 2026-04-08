# hidong_2048 部署说明

## 项目位置
`/home/zzc/.openclaw/workspace/projects/zzc/hidong_2048`

## 技术栈
- React
- TypeScript
- Vite
- Cloudflare Pages

## 本地开发
```bash
cd /home/zzc/.openclaw/workspace/projects/zzc/hidong_2048
npm install
npm run dev
```

## 本地构建
```bash
cd /home/zzc/.openclaw/workspace/projects/zzc/hidong_2048
npm run build
```

构建产物输出到：
- `dist/`

## Cloudflare Pages 部署
当前 Pages 项目名：
- `hidong-2048`

手动部署命令：
```bash
cd /home/zzc/.openclaw/workspace/projects/zzc/hidong_2048
npm run build
npx wrangler pages deploy ./dist --project-name=hidong-2048 --branch=main
```

## 线上地址
- 正式地址：`https://hidong-2048.pages.dev`

## 说明
- 当前项目已初始化本地 git 仓库，但在首个 commit 前，Wrangler 可能提示：
  - `fatal: ambiguous argument 'HEAD'`
  - working tree dirty warning
- 这些提示不会阻塞 Pages 部署。

## 建议发布流程
1. 修改代码
2. 本地测试
3. 执行 `npm run build`
4. 执行 Pages deploy
5. 用预览地址验收
6. 验收通过后再做 git commit
