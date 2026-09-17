# 牌桌风云

四人牌局的战绩记录与积分排行 Web 应用。移动端优先，零和积分制，支持 AI 自然语言查询战绩。

线上地址：https://majiang.site.accio.ai

## 功能

| 模块 | 说明 |
|---|---|
| 风云榜 | 总积分排行，支持今日/本周/本月/全部四个时间范围切换 |
| 记分 | 建局选人、录入分数，强制零和校验（各方分数之和必须为 0） |
| 牌友名册 | 牌友增删改、备注、个人战绩详情与最近对局 |
| 麻将馆设置 | 自定义麻将馆名，并展示在所有战报分享图中 |
| 牌桌智囊 | 自然语言问战绩。三级降级：大模型 → 规则引擎 → 兜底建议 |
| 战报分享 | Canvas 绘制一日战报 / 单桌战报，可保存为图片 |

## 技术栈

- React 18 + Vite 5，HashRouter（静态托管无需服务端 rewrite）
- Supabase：Auth（账号密码，内部域名合成邮箱）、Postgres + RLS、Edge Functions
- 无 UI 框架，全部手写 CSS + 内联 SVG，零图片依赖

## 本地开发

```bash
npm install
cp .env.example .env   # 填入 Supabase URL 与 anon key
npm run dev
```

构建产物输出到 `dist/`：

```bash
npm run build
```

## 环境变量

前端（打包进浏览器，仅可放公开值）：

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Edge Function secrets（在 Supabase Dashboard → Edge Functions → Secrets 配置，**不要写进代码库**）：

| 变量 | 说明 |
|---|---|
| `LLM_API_KEY` | OpenAI 兼容网关的 API Key。未配置时 AI 问答自动降级到规则引擎，功能不中断 |
| `LLM_BASE_URL` | 默认 `https://apihub.agnes-ai.cn/v1` |
| `LLM_MODEL` | 默认 `agnes-2.0-flash` |

## 数据库

迁移脚本位于 `supabase/migrations/`，按序号执行：

- `0001_profiles.sql` — 用户档案
- `0002_scoreboard.sql` — 牌友、对局、分数三张表及 RLS 策略
- `0003_venue_name.sql` — 账号级麻将馆名配置

所有表启用行级安全，数据按 `user_id` 隔离，账号之间互不可见。

## 目录结构

```
src/
  components/   通用组件（ui.jsx 含 Modal/Sheet/Toast，decor.jsx 含全部装饰 SVG）
  lib/          数据访问、计分模型、规则引擎、Canvas 战报绘制
  pages/        七个页面
  styles.css    设计令牌与全局样式
  pages.css     页面级样式
supabase/
  functions/    Edge Functions
  migrations/   数据库迁移
```

## 说明

个人项目，非商业用途。
