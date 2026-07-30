# 白云 HSD 开发者部落 Web

白云 HSD 开发者部落官网首版实现。当前交付以 `1440px` 桌面端为主要验收基准，同一套 Web 代码会在平板和手机上响应式重排。

## 当前状态

- 版本：`v0.2 Frontend Prototype`
- 已实现：完整首页、一级页面、项目/活动/资源/画廊二级页、公开人员名录与成员详情、四个中心详情、用户结果中心与登录续接、登录、招新报名、成员空间、帮助中心
- 数据状态：仍为纯 Nuxt/Vue/TypeScript 前端原型，业务内容使用 TypeScript Mock 数据；后端与数据库尚未开始
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
- Pinia（仅用于现有前端会话状态）
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
| `/people/core` | 核心人员公开名录 | 公开 |
| `/people/members` | 全体成员公开名录 | 公开 |
| `/people/[id]` | 脱敏成员详情与公开荣誉 | 公开 |
| `/centers` | 四大中心 | 公开 |
| `/centers/baize-development` | 白泽开发中心详情 | 公开 |
| `/centers/new-media` | 新媒体中心详情 | 公开 |
| `/centers/tuowei-planning` | 拓维策划中心详情 | 公开 |
| `/centers/talent-development` | 人才发展中心详情 | 公开 |
| `/projects` | 项目列表、筛选、分页状态 | 公开 |
| `/projects/[slug]` | 项目详情 | 公开 |
| `/activities` | 活动列表、筛选、分页状态 | 公开 |
| `/activities/[slug]` | 活动详情 | 公开 |
| `/gallery` | 媒体画廊 | 公开 |
| `/gallery/[slug]` | 媒体专题详情与灯箱 | 公开 |
| `/resources` | 资源中心 | 公开浏览；当前文件未接入 |
| `/resources/[slug]` | 资源详情、文件状态与版本说明 | 公开浏览；内部资料可按需登录确认身份 |
| `/member/results` | 招新录取与阶段考核结果中心 | 登录后访问 |
| `/assessment-results` | 旧考核结果入口 | 登录后兼容跳转至 `/member/results` |
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
- 确认内部成员资料身份（当前文件未接入，不解锁下载）

登录页通过 `redirect` 参数保留来源地址，完成登录后继续原操作。

## 内容详情与文件边界

- 资源列表统一先进入 `/resources/[slug]` 详情，不从列表直接下载。
- 当前真实 PDF、DOCX、ZIP 文件、后端接口和对象存储均未接入；相关按钮显示“文件暂未接入”并保持禁用，不会触发空下载。
- 内部资源可登录并续接回原详情页确认成员身份；登录后隐藏登录提示，但文件按钮仍保持“文件暂未接入”。
- 画廊专题通过 `/gallery/[slug]` 公开浏览。图片加载失败时原位切换为同尺寸 HSD 品牌降级面，并在素材切换后重新尝试加载；灯箱继续保留标题、说明和前后导航。
- 灯箱支持 `ArrowLeft`、`ArrowRight`、`Escape`，打开时聚焦关闭按钮并锁定背景滚动，关闭后焦点回到原照片。
- 结果中心属于个人数据；当前使用 TypeScript Mock 语义数据展示当前有效的招新录取与阶段考核结果，不连接真实成员数据库。
- 个人端不展示完整历史、调剂过程、分数、排名、公开评语、管理员内部备注、报到安排或确认/放弃名额操作。

## 结果中心与预备成员考核台

- 2026-07-30 已将个人结果入口升级为“结果中心”：主路由为 `/member/results`，旧 `/assessment-results` 登录后兼容跳转，并提供“招新录取”和“阶段考核”两个页签。
- 26 级入库参与者初始为预备成员。报名表将支持最多三个互不重复的中心志愿和是否接受调剂。
- 白泽只能作为第一志愿；选择白泽时必须额外选择一个白泽方向。第二、第三志愿以及调剂目标均不允许选择白泽。
- 新媒体、拓维策划、人才发展通过一轮面试即可转为正式成员；白泽必须顺序通过三轮，第三轮通过后才能转正。
- 调剂在线下完成。管理端只录入最终普通中心或未录取结果，不实现线上调剂发起、接收或审批。
- 个人端已实现当前有效结果、三个志愿、白泽意向方向、最终归属和一名负责人展示，不显示完整历史、调剂过程、分数、公开评语或报到安排。
- 计划新增受管理权限保护的 `/admin/recruitment`，采用分组名单、筛选、成员详情抽屉和身份变更二次确认。
- 当前用户端页面使用前端 Mock 数据，不连接真实后端或数据库；管理端仍按独立任务推进。用户端规格见 [`docs/superpowers/specs/2026-07-30-member-results-center-design.md`](docs/superpowers/specs/2026-07-30-member-results-center-design.md)，全系统规格见 [`docs/superpowers/specs/2026-07-30-recruitment-results-system-design.md`](docs/superpowers/specs/2026-07-30-recruitment-results-system-design.md)。

## 成员头像规则

- 头像与个人资料中的头像字段联动。
- 已上传且选择公开时显示本人头像。
- 未上传或选择不公开时显示统一的白底 HSD 默认头像。
- 核心人员重点展示区与普通成员风采区相互独立，普通成员模块继续保留。
- 公开名录与中心详情只通过 `resolvePublicAvatar` 输出头像：未上传或明确不公开的头像 URL 均不得暴露，改用白底 HSD 默认头像。

## 成员荣誉与详情规则

- 核心人员和全体成员名录只展示一至三条已审核、已公开且由成员选定的重点荣誉；不足三条不补位，无公开荣誉不显示空标签。
- 成员卡整卡进入公开 `/people/[id]`，详情页展示该成员全部已公开且审核通过的荣誉。
- 公开成员详情不得包含联系方式、考核结果、成长记录、申请进度、内部备注或证明材料地址，也不生成荣誉排行榜。

## Footer 与非商业用途声明

- 全站 Footer 固定显示：“本平台由学生社团自主建设，仅用于社团管理与校园交流，站内内容及图片不作任何商业用途。”
- 桌面端底栏按版权、声明、帮助中心三段排列；手机端按相同顺序纵向排列。
- Footer 主体上下间距为 `54px 39px`，底栏最小高度为 `52px`，垂直留白约为旧版的四分之三。
- 帮助中心入口在手机端仍保留不小于 `44px` 的可操作高度。

## 2026-07-29 变更

- 新增公开的核心人员与全体成员名录：`/people/core`、`/people/members`。
- 新增四个公开中心详情：`/centers/baize-development`、`/centers/new-media`、`/centers/tuowei-planning`、`/centers/talent-development`。
- 新增资源详情、画廊专题、考核结果和公开成员详情：`/resources/[slug]`、`/gallery/[slug]`、`/assessment-results`、`/people/[id]`。
- 补齐画廊灯箱键盘与焦点行为，以及名录一至三条重点荣誉和详情隐私规则。
- 本阶段仍是纯前端 TypeScript 数据实现；Pinia 仅保存当前演示会话，真实登录、后端 API 与数据库迁移尚未开始。

## 2026-07-30 变更

- Footer 新增学生社团非商业用途声明。
- 实现主站用户结果中心、登录续接、旧入口兼容跳转、录取/考核页签、志愿与负责人展示；管理端仍由独立任务推进。
- 确认三志愿、白泽三轮考核、线下调剂录入、预备成员管理台和正式成员联动设计。
- Footer 主体与底栏压缩至更紧凑的桌面比例，并补齐平板换行和手机纵向排列。

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
