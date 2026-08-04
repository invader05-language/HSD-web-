# 招新批次与用户报名关联设计

日期：2026-08-04
状态：已确认，待实施

## 1. 目标

将管理端“招新批次”从展示型 Mock 模块升级为招新业务的根实体，使用户端报名、管理端名单、考核、结果发布和导出都通过稳定的 `batchId` 关联同一批次。

本设计解决以下问题：

- 用户进入“加入我们”时如何判断当前可以报名的批次。
- 提前开放、自动开放、暂停、延期和提前关闭时如何判断能否提交。
- 同一用户跨批次报名、修改、撤回和重新提交的规则。
- 管理员修改批次配置后如何保留既有申请的历史语义。
- 管理端名单、考核、结果发布和用户结果中心如何按批次隔离。

## 2. 已确认的业务原则

- 全站同一时间最多只能有一个开放报名批次。
- 用户不手动选择批次，系统自动关联当前唯一开放批次。
- 批次按照计划时间自动开放和关闭，同时允许管理员人工干预。
- 管理员可以在计划开始时间之前执行“立即开放”。
- 没有开放批次时，`/join` 保留招新介绍并展示下一批次时间，但报名按钮禁用；直接访问 `/join/apply` 也不能提交。
- 未录取用户可以参加后续批次；已录取用户和正式成员不能再次报名。
- 用户在同一批次只能拥有一条申请记录，截止前可以修改、撤回和重新提交，截止后锁定。
- 用户结果中心只展示最近一次报名批次，不提供往期批次入口；历史数据仅在管理端保留。
- 批次开放后所有配置仍可修改，但不得静默改写既有申请。
- 只有联盟总负责人 `owner` 可以管理批次配置和状态。

## 3. 领域关系

`RecruitmentBatch` 是招新业务的根实体，报名、考核和发布结果必须直接关联批次。

```text
RecruitmentBatch
  └── RecruitmentApplication
        ├── Applicant / Member
        ├── Assessment
        └── PublishedResult
```

关联必须使用不可变的 `batchId`。批次名称、时间、负责人和开放中心均可修改，因此不能作为关联键，也不能在提交后根据时间反推批次。

报名记录建立 `(batchId, memberId)` 唯一约束。修改、撤回和重新提交均更新同一条申请，不创建同批次重复记录。

## 4. 批次状态机

| 有效状态 | 含义 | 用户能否报名 |
| --- | --- | --- |
| 草稿 | 配置中，尚未发布 | 否 |
| 待开始 | 已发布，尚未到开始时间 | 否 |
| 报名中 | 时间有效或管理员提前开放 | 是 |
| 已暂停 | 管理员临时暂停 | 否 |
| 已关闭 | 到达截止时间或管理员提前关闭 | 否 |
| 已归档 | 招新流程完成，只读保存 | 否 |

状态规则：

1. 草稿必须发布后才能自动或人工开放。
2. 已发布批次到达开始时间后自动开放。
3. `owner` 可以在开始时间前执行“立即开放”；操作需要二次确认并记录原计划时间、操作人和实际开放时间。
4. 到达截止时间后自动关闭。截止后不能直接强制开放，必须先延长截止时间。
5. 人工暂停不会被时间规则自动恢复，必须由 `owner` 手动恢复。
6. 人工提前关闭不会在原报名时间范围内自动重新开放。
7. 已关闭批次修改截止时间后可执行“重新开放”，需要二次确认和审计记录。
8. 开放其他批次前必须暂停或关闭当前批次。
9. 修改计划时间后重新计算时间状态，但不得覆盖人工暂停或人工关闭。
10. 归档后批次配置、申请、考核和结果全部只读。

实现中分别保存生命周期状态和人工覆盖状态，由统一领域函数计算 `effectiveStatus`，禁止各页面自行判断。

## 5. 数据模型

### 5.1 RecruitmentBatch

```ts
interface RecruitmentBatch {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  timezone: "Asia/Shanghai";
  openCenterIds: string[];
  responsibleAccountIds: string[];
  lifecycleStatus: "draft" | "published" | "closed" | "archived";
  manualOverride: "none" | "force-open" | "paused" | "force-closed";
  version: number;
  publishedAt?: string;
  actualOpenedAt?: string;
  closedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 RecruitmentApplication

```ts
interface RecruitmentApplication {
  id: string;
  batchId: string;
  memberId: string;
  batchVersionAtSubmission: number;
  batchNameSnapshot: string;
  applicantProfileSnapshot: ApplicantProfileSnapshot;
  contact: string;
  preferences: RecruitmentPreference[];
  centerConfigurationSnapshot: CenterConfigurationSnapshot[];
  acceptsAdjustment: boolean;
  status: "draft" | "submitted" | "withdrawn" | "locked" | "processing" | "completed";
  submittedAt?: string;
  updatedAt: string;
  withdrawnAt?: string;
  lockedAt?: string;
}
```

`applicantProfileSnapshot` 保存报名时的姓名、学号、年级和班级。用户后续修改个人资料时，不静默改写已提交申请；如确有需要，由管理员执行明确的同步动作。

所有时间在服务端和数据库中保存为 UTC，界面按照 `Asia/Shanghai` 展示。

## 6. 批次配置修改规则

- 修改名称：用户端立即显示新名称，既有申请保留提交时名称快照。
- 修改开始时间：重新计算自动状态，人工暂停和人工关闭仍优先。
- 缩短截止时间且新时间已经过去：立即关闭批次并锁定申请，需要二次确认。
- 延长截止时间：自动关闭的批次可以重新开放；人工关闭的批次需要明确执行“重新开放”。
- 移除开放中心：新申请不能选择；已有申请保留原志愿并标记“该中心已关闭”。
- 用户编辑包含已关闭中心的旧申请时，必须重新选择有效志愿才能再次提交。
- 更换负责人：不修改报名数据，只更新处理权限和联系人。
- 每次修改递增 `version`，记录操作人、修改前后值、原因和时间。
- `id` 创建后不可修改。

## 7. 用户端行为

### 7.1 加入我们

`/join` 调用公开查询获取当前唯一开放批次和下一待开始批次。

- 有开放批次：展示批次名称、报名时间、开放中心和报名入口。
- 无开放批次但存在已发布的待开始批次：保留招新介绍，展示下一批次时间，禁用报名按钮。
- 无开放批次且没有待开始批次：保留招新介绍，显示“当前暂无招新安排”，禁用报名按钮。
- 不允许用户手动选择批次。

### 7.2 报名表

`/join/apply` 进入时重新获取开放批次，并将 `batchId` 固定在当前表单会话。未登录用户登录后续接回同一批次报名表。

直接访问 `/join/apply` 且当前没有开放批次时，只显示“当前暂无开放报名”及返回 `/join` 的入口，不创建草稿或申请记录。

提交时服务端必须重新验证：

- 批次仍为报名中。
- 当前用户符合报名身份。
- 当前用户在本批次不存在另一条有效申请。
- 所选中心在本次提交时仍可选择。

如果填写期间批次暂停、关闭或截止，前端保留草稿并显示不能提交的原因。

同批次已有申请时进入查看状态；截止前可以编辑或撤回。撤回后仍可在截止前重新提交。截止后申请锁定。

未录取用户可参加下一批次。已录取用户和正式成员不显示可提交表单，并明确展示身份限制原因。

### 7.3 结果中心

结果中心只查询并展示当前账号最近一次报名批次。往期申请和结果仍在数据库保留，但不向用户提供历史入口。

## 8. 管理端行为

建议采用以批次为上下文的路由：

```text
/admin/recruitment/batches
/admin/recruitment/batches/:batchId
/admin/recruitment/batches/:batchId/applications
/admin/recruitment/batches/:batchId/assessment
/admin/recruitment/batches/:batchId/publish
```

批次列表支持新建、发布、立即开放、暂停、恢复、提前关闭、重新开放和归档。只有 `owner` 能执行这些操作；其他管理员仅能查看和处理自身有权限的数据。

进入具体批次后，页面顶部始终显示批次名称、有效状态、计划时间、实际开放时间、报名人数、开放中心、负责人和配置版本，并提供“查看用户端页面”入口。

报名名单、考核台、结果发布和导出只能处理当前 `batchId` 的数据。已归档批次全部只读。CSV 文件名和内容从当前批次读取，不得写死批次名称。结果发布不能跨批次选择人员。

## 9. 接口边界

公开及成员接口：

```text
GET  /api/recruitment/current
GET  /api/recruitment/upcoming
GET  /api/recruitment/batches/:batchId/my-application
POST /api/recruitment/batches/:batchId/applications
PATCH /api/recruitment/batches/:batchId/applications/:applicationId
POST /api/recruitment/batches/:batchId/applications/:applicationId/withdraw
```

管理端使用命令式状态接口，禁止前端直接写入状态字段：

```text
POST /api/admin/recruitment/batches/:batchId/publish
POST /api/admin/recruitment/batches/:batchId/open-now
POST /api/admin/recruitment/batches/:batchId/pause
POST /api/admin/recruitment/batches/:batchId/resume
POST /api/admin/recruitment/batches/:batchId/close
POST /api/admin/recruitment/batches/:batchId/reopen
POST /api/admin/recruitment/batches/:batchId/archive
```

所有权限、身份、批次状态、截止时间和唯一性约束必须由后端验证，不能依赖前端按钮或路由守卫。

## 10. 并发、错误与审计

- 两个管理操作同时开放不同批次时，只允许一个事务成功。
- 同一用户重复提交同一批次时，通过数据库唯一约束拒绝重复记录。
- 批次配置版本过期时返回冲突，管理员刷新后重新确认。
- 用户提交时批次已暂停、关闭或截止时，返回明确错误码并保留前端草稿。
- 用户选择的中心已移除时，拒绝新提交；既有申请保持快照。
- 批次开放、暂停、恢复、关闭、归档和配置修改全部记录操作人、修改前后值、原因和时间。
- 只有 `owner` 可以调用批次管理命令接口。

建议使用稳定的业务错误码，例如：

```text
NO_OPEN_RECRUITMENT_BATCH
BATCH_NOT_OPEN
BATCH_ALREADY_OPEN
BATCH_VERSION_CONFLICT
APPLICATION_ALREADY_EXISTS
APPLICATION_LOCKED
APPLICANT_NOT_ELIGIBLE
CENTER_NOT_AVAILABLE
OWNER_PERMISSION_REQUIRED
```

## 11. 测试与验收

### 11.1 单元测试

- 开始时间和截止时间边界。
- 提前开放、暂停、恢复、提前关闭、延期和重新开放。
- 人工状态优先于自动时间状态。
- 配置版本递增及快照保持。
- 开放中心移除后的新旧申请处理。
- 最近一次报名结果选择规则。

### 11.2 集成测试

- 全系统只能有一个开放批次。
- `(batchId, memberId)` 唯一约束。
- 截止前编辑、撤回和重新提交，截止后锁定。
- 未录取用户可参加后续批次，正式成员和已录取用户被拒绝。
- 管理端名单、考核、发布和导出按 `batchId` 隔离。
- 非 `owner` 无法修改批次状态或配置。

### 11.3 端到端测试

- 无开放批次时 `/join` 禁用报名，`/join/apply` 无法提交。
- 登录续接后仍关联原批次。
- 填写期间批次关闭时保留草稿并显示错误。
- 用户完成提交、编辑、撤回和重新提交。
- 管理端按批次查看报名、考核和发布结果。
- 结果中心只展示最近一次报名批次。
- `1440px` 与 `390px` 布局、键盘操作、状态反馈和无横向溢出。

## 12. 当前原型迁移重点

- 将 `applicationsByMemberId` 改为按 `batchId + memberId` 查询的报名仓储。
- 为 `SubmittedRecruitmentApplication` 增加 `batchId`、状态、版本和快照字段。
- 移除用户端、管理端、CSV 和结果中心中写死的“2026 秋季招新”。
- 将静态 `ADMIN_CANDIDATES` 拆为按批次查询的申请、考核和结果数据。
- 把批次有效状态计算集中到领域函数，禁止页面自行比较时间或硬编码 `CURRENT`。
- 后端接入前，Mock 实现也应通过统一 repository/store 模拟相同接口和约束。

## 13. 本轮不包含

- 多个批次同时开放。
- 用户手动选择报名批次。
- 用户端往期申请或结果历史页。
- 预报名或候补登记。
- 自动调剂、跨批次迁移申请。
- 真实消息通知、短信或邮件发送。
