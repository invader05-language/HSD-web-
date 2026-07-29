# 白云 HSD 开发者部落 Web

白云 HSD 开发者部落官网首版实现。当前交付以 `1440px` 桌面端为主要验收基准，同一套 Web 代码会在平板和手机上响应式重排。

## 当前状态

- 版本：`v0.2 Frontend Prototype`
- 已实现：完整首页、一级页面、项目/活动二级页、登录、招新报名、成员空间、帮助中心
- 数据状态：使用 TypeScript Mock 数据，暂未连接真实后台
- 图片状态：未提供正式授权素材的位置统一显示 HSD 素材占位，不使用需求海报或未授权品牌资产

## 在线试用

- 国内访问部署：<https://baiyun-hsd-web-4mfykljr.edgeone.cool>
- 海外备用部署：<https://baiyun-hsd-web.vercel.app>
- 托管方案：腾讯云 EdgeOne Pages 免费套餐（全球可用区，含中国大陆）+ Vercel Hobby 备用
- EdgeOne 默认域名受预览鉴权保护，临时体验链接需在控制台点击“预览”生成，有效期为 3 小时；长期公开访问需绑定自有域名
- 当前为前端原型环境，登录、报名和成员数据均为 Mock，不保存真实业务数据

## 技术栈

- Nuxt 4 + Vue 3 + TypeScript
- Tailwind CSS 4 + CSS 设计令牌
- Pinia
- VeeValidate + Zod
- Pretext 文本布局测量
- Vitest + Playwright

后续接口阶段建议使用 NestJS + PostgreSQL + Prisma。

## 本地运行

要求 Node.js 20+ 与 pnpm 10+。

```bash
pnpm install
pnpm run dev
```

生产构建与预览：

```bash
pnpm run build
pnpm run preview
```

Vercel 免费套餐部署：

```bash
vercel build --prod
pnpm run vercel:materialize
vercel deploy --prebuilt --prod
```

`vercel:materialize` 用于将 Windows 构建产物中的目录联接展开，并把 Nuxt 路由合并到单一服务端函数，避免超出 Hobby 套餐的函数数量限制。
`nuxt.config.ts` 同时将 Pinia 纳入 SSR 编译，确保 Vue 生产环境常量在 Vercel Node.js 函数中完成替换。

EdgeOne Pages 静态部署：

```bash
pnpm exec nuxi generate
tar.exe -a -cf artifacts/baiyun-hsd-edgeone-clean.zip -C .output/public .
```

将生成的 ZIP 通过 EdgeOne Pages“直接上传”发布。Windows 环境不要使用 `Compress-Archive`，否则 ZIP 内的反斜杠路径可能导致平台无法识别静态文件。

测试：

```bash
pnpm run test:unit
pnpm run test:e2e
```

Playwright 默认调用本机 Chrome；首次测试前请确认已安装 Chrome。

## 页面路由

| 路由 | 页面 | 访问规则 |
| --- | --- | --- |
| `/` | 完整首页 | 公开 |
| `/about` | 部落介绍、核心人员、成员风采 | 公开 |
| `/centers` | 四大中心 | 公开 |
| `/projects` | 项目列表、筛选、分页状态 | 公开 |
| `/projects/[slug]` | 项目详情 | 公开 |
| `/activities` | 活动列表、筛选、分页状态 | 公开 |
| `/activities/[slug]` | 活动详情 | 公开 |
| `/gallery` | 媒体画廊 | 公开 |
| `/resources` | 资源中心 | 公开浏览；内部下载按需登录 |
| `/join` | 招新说明 | 公开 |
| `/join/apply` | 招新报名表 | 登录后访问 |
| `/login` | 成员登录与来源路由续接 | 公开 |
| `/member` | 申请、考核、活动、成长与个人资料 | 登录后访问 |
| `/help` | 帮助中心 | 公开 |

## 权限边界

项目、活动、媒体作品、成员公开风采和公开资源默认无需登录。只有以下个人数据或个人操作要求登录：

- 提交或取消活动报名
- 填写招新申请、查看申请进度
- 查看个人考核与成长记录
- 编辑个人资料和头像
- 下载内部成员资料

登录页通过 `redirect` 参数保留来源地址，完成登录后继续原操作。

## 成员头像规则

- 头像与个人资料中的头像字段联动。
- 已上传且选择公开时显示本人头像。
- 未上传或选择不公开时显示统一的白底 HSD 默认头像。
- 核心人员重点展示区与普通成员风采区相互独立，普通成员模块继续保留。

## 设计基线

设计方向为“正式科技门户 + 校园创新社区”。核心颜色：

| 用途 | 色值 |
| --- | --- |
| 品牌深红 | `#B1202B` |
| 近黑 | `#211F1E` |
| 暖白 | `#F4F0EB` |
| 冷灰 | `#F5F6F7` |
| 素材占位灰 | `#DEDAD5` |

详细约定见 [`init/AGENTS.md`](init/AGENTS.md)，功能范围见 [`HSD需求文档.md`](HSD需求文档.md)。

当前 1440px 浏览器验收长图：

- [完整首页](artifacts/hsd-homepage-1440.png)
- [部落介绍、核心人员与成员风采](artifacts/hsd-about-1440.png)

## Mock 边界

当前页面交互用于确认信息结构和视觉效果：

- 登录接受符合前端校验规则的演示账号，不连接真实身份系统。
- 报名提交只在前端展示成功状态，不写入数据库。
- 筛选、搜索、空状态和分页状态已呈现；分页暂不请求接口。
- 项目、活动、成员、资源均为脱敏 Mock 内容。
- 正式开发接入 API 时需保留现有路由、权限边界和状态反馈。

## 验收

已配置：

- 单元测试：品牌、权限策略、首页顺序、登录续接
- 浏览器测试：首页关键模块、活动详情到登录链路、主要路由横向溢出
- 生产构建：Nuxt SSR

页面或交互修改后必须同步更新需求文档、原型/截图、变更记录和验收标准。
