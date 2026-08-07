# 白云 HSD 开发者部落 Web

白云 HSD 开发者部落官网首版实现。当前交付以 `1440px` 桌面端为主要验收基准，同一套 Web 代码会在平板和手机上响应式重排。

## 当前状态

- 版本：`v0.3 Frontend Administration Prototype`
- 已实现：完整官网与内容详情、公开人员与中心、成员登录/资料/结果/三步报名、招新批次与考核、成员与管理员权限、内容发布及首页门户投影等前端流程
- 数据状态：仍为纯 Nuxt/Vue/TypeScript 前端原型，业务内容使用 TypeScript Mock 数据；后端与数据库尚未开始
- 图片状态：未提供正式授权素材的位置统一显示 HSD 素材占位，不使用需求海报或未授权品牌资产

## 在线试用

- 国内访问部署：<https://baiyun-hsd-web-4mfykljr.edgeone.cool>
- 海外备用部署：<https://baiyun-hsd-web.vercel.app>
- 托管方案：腾讯云 EdgeOne Pages 免费套餐（全球可用区，含中国大陆）+ Vercel Hobby 备用
- EdgeOne 默认域名受预览鉴权保护，临时体验链接需在控制台点击“预览”生成，有效期为 3 小时；长期公开访问需绑定自有域名
- 当前为前端原型环境，登录、报名和成员数据均为 Mock；活动与画廊的草稿、公开快照、报名审核状态会按版本写入浏览器 `localStorage`，仍不连接真实后端

## 技术栈

- Nuxt 4 + Vue 3 + TypeScript
- Tailwind CSS 4 + CSS 设计令牌
- Pinia（会话、活动和画廊领域状态；后端接入前使用版本化浏览器存储）
- VeeValidate + Zod
- Pretext 文本布局测量
- Vitest + Playwright

后续接口阶段建议使用 NestJS + PostgreSQL + Prisma。

## 本地运行

要求 Node.js 22.19.0 与 pnpm 10.33.0。

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
pnpm run typecheck
pnpm run test:e2e
```

Playwright 默认调用本机 Chrome；首次测试前请确认已安装 Chrome。

### 渲染与会话说明

- `/about`、`/centers`、`/projects/**`、`/gallery` 和 `/resources` 保留 SSR；首页、动态/新闻、招新、成员空间和管理端因当前需要读取浏览器内的 Mock 发布状态而采用 CSR。
- 这不是后端权限模型。当前登录、管理员权限和发布状态只用于前端演示；接入真实 API 后必须由服务端重新认证、授权和返回公开投影。
- 登录会话保存在当前标签页的 `sessionStorage`，受保护页面刷新时会先恢复会话再执行路由判定。

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
| `/member/profile` | 当前人员个人资料与头像编辑 | 登录后访问 |
| `/admin/recruitment` | 预备成员分组、筛选、考核与线下结果录入工作台 | 登录后访问；正式后端还需校验管理权限 |
| `/admin/recruitment/batches/**` | 招新批次、报名、考核与结果发布 | 管理员前端演示权限 |
| `/admin/members/**`、`/admin/accounts` | 成员与管理员账号管理 | 管理员前端演示权限；真实权限待后端校验 |
| `/admin/content/**`、`/admin/homepage` | 内容发布与首页固定槽位配置 | 管理员前端演示权限 |
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
- 已新增受登录保护的 `/admin/recruitment` 桌面端原型，采用第一志愿分组、组合筛选、名单表格、成员详情抽屉和身份变更二次确认。
- 用户端与管理端采用同一套 Nuxt Web 工程和部署，共用品牌令牌、登录会话、领域类型和未来 API 契约；两端使用独立路由命名空间与布局，管理导航不会混入官网。
- 当前用户端和管理端均使用前端 Mock 数据，不连接真实后端或数据库。用户端规格见 [`docs/superpowers/specs/2026-07-30-member-results-center-design.md`](docs/superpowers/specs/2026-07-30-member-results-center-design.md)，全系统规格见 [`docs/superpowers/specs/2026-07-30-recruitment-results-system-design.md`](docs/superpowers/specs/2026-07-30-recruitment-results-system-design.md)。
- 招新考核允许在报名开放或暂停时录入已有候选人的当前轮次和线下调剂决定；全局轮次推进与整批发布仍要求批次关闭。首次结果保存锁定报名，真实后端需保留候选人命令与批次命令的独立审计边界。
- 首页快讯与“正在发生的事”均读取已发布门户目录；手动推荐优先，空槽运行时自动取最新有效快讯、新闻或公告，不把活动混入新闻区。`/activities` 活动记录使用 `eventAt` 表示活动发生时间，`publishedAt` 只表示内容发布时间。

## 桌面管理平台原型

管理端和官网仍位于同一个 Nuxt 4 工程，但通过 `/admin/**` 路由和 `admin.vue` 布局完全隔离。当前以 `1440px` 桌面 Web 为主要设计目标，并兼容 `1366px` 笔记本宽度。管理端左侧导航固定为视口高度，长页面截图下方不会出现浅色空档。

管理平台分为七个业务域：

| 业务域 | 代表路由 | 主要能力 |
| --- | --- | --- |
| 工作台 | `/admin` | 待办、招新进度、内容状态、存储概览、快捷新建 |
| 招新与考核 | `/admin/recruitment/**` | 批次、报名人员、考核录入、结果发布 |
| 组织与成员 | `/admin/members/**`、`/admin/core-members`、`/admin/honors` | 成员资料、核心人员、中心组织、荣誉审核 |
| 项目与活动 | `/admin/projects`、`/admin/activities`、`/admin/activities/new`、`/admin/activities/[id]`、`/admin/activities/registrations` | 项目成果、活动草稿/发布、报名审核与名单 |
| 内容与门户 | `/admin/content/**` | 快讯/新闻/帮助内容、首页固定槽位、Banner |
| 媒体与资源 | `/admin/gallery`、`/admin/resources` | 画廊专题、资源版本 |
| 系统与权限 | `/admin/accounts`、`/admin/roles`、`/admin/logs`、`/admin/recycle-bin` | 管理账号、角色矩阵、操作日志、可恢复删除 |

原型中的保存、审核、发布和下架是独立状态；身份、结果发布、权限和永久删除等高风险动作均需二次确认。活动与画廊的领域写操作通过 Pinia Store 持久化草稿和公开快照，其他管理模块仍保留前端 Mock 边界，不写入数据库。

后端接入活动、画廊和项目直接上传时，先阅读 [`docs/handoffs/2026-08-07-content-direct-upload-backend.md`](docs/handoffs/2026-08-07-content-direct-upload-backend.md)，其中记录了上传附件、内容归属、发布快照、权限校验和历史 Mock 数据迁移边界。项目接口不再接收或返回“制作团队”“协作中心”；管理员账号需要同时具备可用的成员档案。

图片、视频与学习资料的正式实现建议采用“浏览器分片直传对象存储 + 数据库保存元数据和引用关系 + 异步缩略图/转码/病毒扫描 + CDN 分发”。只有处理完成且审核通过的素材才可被官网选择。PDF 预览、Office 转换、临时签名下载和访问日志在原型中明确标记为后端待接入能力。

管理平台完整设计规格与实施计划：

- [`docs/superpowers/specs/2026-07-30-admin-platform-design.md`](docs/superpowers/specs/2026-07-30-admin-platform-design.md)
- [`docs/superpowers/plans/2026-07-30-admin-platform-prototype.md`](docs/superpowers/plans/2026-07-30-admin-platform-prototype.md)

## 成员头像规则

- 头像与个人资料中的头像字段联动。
- 上传头像后自动同步到公开成员展示，不提供独立的“是否公开头像”开关。
- 未上传或移除头像时显示统一的白底 HSD 默认头像。
- 核心人员重点展示区与普通成员风采区相互独立，普通成员模块继续保留。
- 公开名录与中心详情只通过 `resolvePublicAvatar` 输出头像；`avatarVisible` 是由是否存在头像自动推导的展示状态，不是用户隐私开关。

## 演示账号与人员数据边界

- `demo-member` 对应 `member-lin`，用于验证正式成员个人资料、公开人员和管理端联动。
- `demo-applicant` 对应独立的 26 级预备成员档案，用于验证招新报名；提交报名只更新该预备人员档案和招新申请。
- `sessionStore.currentMemberId` 是当前人员 ID 的唯一权威来源；成员档案 Store 只维护 `profiles[id]`，页面统一通过当前人员 composable 查询资料。
- 预备成员没有正式成员公开 ID，不进入核心人员、公开成员、中心正式成员或正式成员管理数据源；达到录取条件后才建立正式成员关系。
- 结果中心同样按当前人员 ID 取数：正式成员演示账号显示已录取结果；预备成员未报名时显示无申请，提交后显示待公布，不复用正式成员结果。

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
- 实现主站用户结果中心、登录续接、旧入口兼容跳转、录取/考核页签、志愿与负责人展示。
- 实现独立管理布局下的预备成员考核台原型，并确认用户端与管理端采用同工程、分路由、分布局架构。
- 确认三志愿、白泽三轮考核、线下调剂录入、预备成员管理台和正式成员联动设计。
- 完整扩展桌面管理平台七大业务域，补齐项目活动、门户内容、媒体资源、账号权限与审计页面。
- 明确媒体文件进入对象存储、数据库只保存元数据与引用，处理和审核完成后才能公开使用。
- Footer 主体与底栏压缩至更紧凑的桌面比例，并补齐平板换行和手机纵向排列。

## 2026-08-02 变更

- 新增 `/member/profile` 与三步招新报名流程，并将正式成员和预备成员拆分为两个独立 Mock 档案。
- 统一当前人员身份来源为 `sessionStore.currentMemberId`，移除成员档案 Store 中重复的当前人员 ID，并让结果中心按该 ID 选择数据。
- 报名提交不再覆盖 `member-lin`，预备成员不会投射到公开人员、核心人员或正式成员管理名单。
- 头像规则调整为“上传即自动公开、移除即恢复默认 HSD 头像”，同步移除管理端头像公开开关。
- 新增 GitHub Actions，自动执行单元测试、TypeScript 检查、Nuxt 生产构建和 Playwright 端到端测试。

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
- [管理工作台](artifacts/admin/hsd-admin-dashboard-1440.png)
- [招新考核台](artifacts/admin/hsd-admin-recruitment-1440.png)
- [项目管理](artifacts/admin/hsd-admin-projects-1440.png)
- [首页内容配置](artifacts/admin/hsd-admin-homepage-config-1440.png)
- [学习资料](artifacts/admin/hsd-admin-resources-1440.png)
- [角色权限](artifacts/admin/hsd-admin-roles-1440.png)

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
- 生产构建：Nuxt 混合渲染（SSR + CSR route rules）

页面或交互修改后必须同步更新需求文档、原型/截图、变更记录和验收标准。

## 2026-08-06 管理工作台权限修复

- 旧报名名单入口统一跳转到批次报名入口；名单、详情和导出只读取当前管理员中心范围内的第一志愿报名人员，联盟总负责人保留全量访问权。
- 内容列表、详情、预览与草稿写操作统一执行内容所有权校验；中心管理员只能操作自己创建的内容。
- Dashboard 门户状态改为 capability 投影：没有 `portal.configure` 或 `portal.publish` 的中心管理员收到 `portal: null`，页面不显示门户状态或配置入口。
- 媒体素材新增稳定的 `ownerCenterId`，摄影组素材归入新媒体中心；禁止根据展示名称字符串推断权限。
- Dashboard OpenAPI、前端类型、Owner/Center JSON 示例和契约测试保持一致。
