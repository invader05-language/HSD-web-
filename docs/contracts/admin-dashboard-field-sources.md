# 管理工作台字段来源

这份表是后端实现 `GET /api/v1/admin/dashboard` 时的字段归属约束。工作台是只读投影，不新增招新、内容、门户或媒体状态表。

| 快照区域 | 字段 | 后端权威来源 | 规则 |
| --- | --- | --- | --- |
| `operator` | `id/name/level/centerRole` | 当前登录会话与管理员账号 | 不接受客户端传入账号 id；由服务端 session 解析 |
| `operator.capabilities` | 能力集合 | 服务端 RBAC + 中心范围 | owner 全局；中心管理员只返回已授权中心范围 |
| `metrics` | 待处理、内容审核、待发布、异常 | 招新考核、内容审核、媒体处理、自动化失败表 | 只计算当前操作者可见且可执行的事项 |
| `tasks` | `target` | 业务资源 id + 前端登记的语义动作 | 服务端返回 module/action/resource id，不返回任意外链 |
| `recruitment.batch` | 批次名称、状态、时间、开放中心 | 招新批次状态机 | 状态必须按服务端时钟计算，时区保存为 Asia/Shanghai |
| `recruitment` 选择 | `selection` | 招新批次 + 考核/发布状态 | 优先 open/paused；其次 unfinished-work；其次最近 upcoming；没有则 null |
| `recruitment.assessment` | total/ready/pending/adjustmentPending/decision | 该批次考核记录 | 不能把预备成员报名直接当正式成员；发布资格由后端事务校验 |
| `content` | `inReview/pendingPublication/recent` | 内容记录与审核状态 | recent 按 updatedAt 降序；中心管理员仅投影自己创建的内容，避免泄漏其他范围信息 |
| `portal` | draft/published 状态；无门户能力时为 `null` | 门户配置版本 | 仅拥有 `portal.configure` 或 `portal.publish` 的操作者可读取；发布配置必须经过 owner 权限与版本校验 |
| `media` | total/processing/failed/reviewPending | 媒体素材处理与审核 | 素材归属使用稳定的 `ownerCenterId`，不得以展示名称字符串推断授权；不返回虚构容量上限；失败项保留可追踪 resource id |
| `warnings` | 自动化、持久化、同步错误 | 各领域 outbox/失败记录 | 只展示未解决告警；每条告警可选语义 target |

## 一致性与隐私

- 快照应在一个读事务或同等一致性边界内生成，并在 `generatedAt` 标记服务端生成时间。
- 业务动作仍通过各领域 API 执行；工作台只读，不能成为写入入口或状态机副本。
- 不在工作台快照中返回报名联系方式、身份证明、内部笔记、密码、原始文件地址或完整内容正文。
- 后端不可相信 `resourceId` 与当前账号的权限关系；每个详情/操作接口必须再次做资源级授权。
- API 不可用时前端显示错误态；生产环境禁止把 Mock 快照当作真实业务数据继续展示。
