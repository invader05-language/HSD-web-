# HSD 团队协作与发布约定

本文件是统一流程的目标配置；是否已启用，以远程分支、PR 合并和维护者验收记录为准。

## 开发入口

前后端保持独立仓库，长期分支只用 `main`、`develop`。默认分支仍为 `main`，新人克隆显式使用 `--branch develop`。如远程尚无 develop，应等待维护者完成两仓库统一，不从历史修复分支自行开工。

| 对象 | 用途 | 合入方式 |
| --- | --- | --- |
| main | 稳定发布源，HEAD 不代表已上线 | 经评审和 CI 的发布 / 热修复 PR |
| develop | 个人开发起点、团队集成 | 个人任务 PR，至少一位非作者评审 |
| codex/姓名-任务 | 从 develop 创建的短期分支 | PR 回 develop，配套前后端尽量同名 |
| codex/hotfix-问题 | 紧急生产修复 | 从精确线上版本开始，修复后同步 main / develop |

个人功能分支可以按约定 squash。develop → main、main → develop 使用 merge commit；不得 squash / rebase 破坏长期分支祖先关系。共享分支禁止强推，不删除历史修复分支及 dev1。

## PR 与接口协作

普通 PR 显式选 base=develop；发布 PR 才选 main。说明触发场景、用户影响、配套仓库 PR、接口契约和迁移影响、实际验证及回退方式。跨仓库任务先确定 DTO / OpenAPI，更新快照和生成类型，记录兼容性与合并 / 发布顺序。

合并前确认包含最新 base，实际 `verify` 成功，并至少一位非作者批准。main 的治理或热修复提交要通过 PR 回灌 develop；不要让两条长期线长期分叉。若有未上线内容，不直接部署整个 main 处理线上紧急问题，应从精确生产标签 / SHA 做独立修复，再回灌两条线。

## CI 与权限

工作流保留各仓库原有全部 jobs / steps，覆盖 main / develop 的 push 与 PR，并支持手动触发。前端 Mock / 路由拦截测试不代替真实 API、存储和权限联调。

CODEOWNERS 指向仓库负责人 `@invader05-language`，只定义评审归属。管理员需另外启用 PR、CODEOWNERS、至少一位非作者批准、撤销过期批准、解决对话及实际 verify 检查，禁止强推 / 删除长期分支，不启用与 merge commit 冲突的线性历史要求。固定标签也应保护。

2026-10-27 核验凭据只有 write，无 admin；当时两仓库 main 未保护，私有后端 rulesets 查询还提示套餐限制。本次提交不能证明保护已开启。负责人未完成设置前为“人工受控”：由指定维护者合并、保留评审与 CI，持写权限者仍可能绕过约定。保持后端私有；套餐不足时由负责人选择升级，不改公开绕过。

## 配套版本与生产边界

[production-source-baseline.json](production-source-baseline.json) 固定记录整理前已部署源码，不是实时 main 指针；baseline/2026-10-27-production 标签不可移动。全部统一验收完成后，维护者才创建同名 handoff/2026-10-27 标签并发布新人入口。

每次上线另行记录 releaseId、frontendCommit、backendCommit、tree、产物 hash 和迁移决策。仓库 push / merge 不隐含生产部署，不改旧 release manifest。生产按后端运行手册准备备份、Linux 构建、旧哈希资源兼容、健康检查和回退。

main / develop 更新可能触发外部发布时，先由有权限维护者核实并隔离此次整理；Webhook 查询无权限不能证明没有自动发布。本轮统一不部署、不改数据库或生产配置、不重置账号。

本地环境和必测业务见 [开发交接文档](development-onboarding.md)。真实联调使用隔离库与虚构账号，覆盖登录、上传预览、普通通过、普通调剂及调入白泽的去向和二维码、关闭批次读取、未公开权限及跨中心并发。
