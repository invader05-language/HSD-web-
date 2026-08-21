<script setup lang="ts">
import { useMemberAdministrationStore } from "~/stores/member-administration";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { getOrganizationPositionLabel } from "~/utils/organization-positions";

definePageMeta({ layout: "admin" });
useHead({ title: "中心组织｜HSD 管理台" });

const administration = useMemberAdministrationStore();
const gateway = useOrganizationGateway();
if (gateway) administration.activateApiMode();
onMounted(async () => { if (gateway) await administration.refreshFromApi(gateway); });
const centers = computed(() => administration.apiCenters);
const ministers = (centerId: string) => administration.apiCenters
  .find((center) => center.id === centerId)?.positions
  .filter((position) => position.type === "CENTER_MINISTER") ?? [];
</script>

<template>
  <div class="admin-recruitment-page admin-section-page">
    <AdminPageHeading eyebrow="Organization" title="中心组织" description="每个中心可有多位部长；组织人事任免仅联盟负责人可操作。" />
    <p v-if="administration.apiLoading" role="status" class="admin-empty-row">正在同步中心职务…</p>
    <p v-else-if="administration.apiError" role="alert" class="member-profile-error">{{ administration.apiError.message }}</p>
    <section class="admin-center-admin-grid">
      <article v-for="(center, index) in centers" :key="center.id">
        <span>0{{ index + 1 }}</span><AdminStatusPill :status="center.active ? '正常' : '停用'" /><h2>{{ center.name }}</h2>
        <dl><div><dt>部长</dt><dd>{{ ministers(center.id).length }} 人</dd></div><div><dt>职务</dt><dd>{{ ministers(center.id).map((item) => getOrganizationPositionLabel(item.type)).join('、') || '暂无' }}</dd></div></dl>
        <p>部长名单和任免请在成员详情中处理；中心归属对正式成员只读，本轮不提供转中心。</p>
      </article>
    </section>
  </div>
</template>
