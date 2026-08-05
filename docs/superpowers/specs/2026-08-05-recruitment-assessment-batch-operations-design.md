# 招新批次与预备成员考核操作边界规格

## 目标

让每个报名、考核结果和最终录取都绑定到明确的招新批次，并让管理端只呈现当前需要处理的人员，避免已完成记录持续占用高容量名单。

## 已确认业务规则

1. 用户端 `/join` 只接受当前唯一开放批次；没有开放批次时展示介绍和下一批时间，但报名入口禁用，不产生无法归属批次的预报名。
2. 招新批次由联盟总负责人创建，普通管理员不显示“新建招新批次”入口，也不能通过 store 命令绕过权限。
3. 新建批次保存为草稿；负责人固定为创建者联盟总负责人。报名表统一使用 `/join/apply`，不为批次创建额外表单配置。
4. 批次关闭后才能整批发布考核结果。结果发布后禁止重新开放该批次；需要重新招新时创建新批次。
5. 结果第一次写入某个成员时锁定该成员报名，之后不能编辑志愿或撤回；其他成员仍可在报名窗口内操作。
6. 考核工作台只显示当前轮待录入和待调剂人员。普通中心完成通过/不通过后立即隐藏；白泽通过当前轮后隐藏，推进全局轮次后在下一轮重新出现；不通过人员不再回显。
7. 推进全局轮次前，当前轮所有可编辑结果和所有待调剂决定必须完成。
8. 调剂使用一个联合选择：普通中心表示录取至该中心，`not-admitted` 表示不录取；白泽不能作为调剂目标，空选择必须拒绝保存。
9. 批次生命周期审计和自动化失败记录随批次状态持久化，至少包含操作人、原计划开始时间和实际操作时间。

## 前端 Mock 与后端契约

当前实现使用 Pinia + `localStorage` 模拟事务；真实后端应保持相同领域命令边界：

```text
POST /admin/recruitment/batches
  { name, startAt, endAt, openCenterIds }
  -> draft batch, responsibleAccountIds=[owner]

POST /admin/recruitment/batches/:batchId/assessment/:candidateId/round
  { round, outcome, internalNote }
  -> locks application for candidate and writes assessment audit

POST /admin/recruitment/batches/:batchId/assessment/:candidateId/adjustment
  { decision: centerId | "not-admitted" }

POST /admin/recruitment/batches/:batchId/assessment/advance
POST /admin/recruitment/batches/:batchId/assessment/publish
  -> publish requires effective batch status=closed and all workflow items complete
```

后端必须在事务中完成“首次考核结果 + 报名锁定”，并以 `batchId + memberId` 唯一约束报名；发布后禁止新增报名进入已发布考核状态。前端保留 `sourceType/sourceUrl/externalId` 等可选外部内容字段，但本功能不接入微信公众号或大模型。

## 数据投影

- 管理考核台读取 `getActionableCandidates(batchId)`。
- 结果发布页读取批次全量 `getCandidates(batchId)`，因此隐藏不等于删除。
- 只有批次发布事务完成后，成员结果、正式成员身份和公开投影才更新。
