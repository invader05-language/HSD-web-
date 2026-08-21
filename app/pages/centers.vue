<script setup lang="ts">
import { CENTERS } from "~/data/home";
import { useOrganizationGateway } from "~/composables/useOrganizationGateway";
import { usePublicCentersStore } from "~/stores/public-centers";
import OrganizationLeadershipPanel from "~/components/OrganizationLeadershipPanel.vue";
import { PAGE_VISUALS } from "~/data/page-visuals";

const route = useRoute();
const organizationGateway = useOrganizationGateway();
const publicCenters = usePublicCentersStore();
if (organizationGateway) {
  await useAsyncData("public-center-list", () => publicCenters.refreshList(organizationGateway));
  // The lightweight Pinia integration does not serialize SSR state into the client.
  // Re-fetch the live leadership snapshot after hydration so navigation cannot erase it.
  if (import.meta.client) await publicCenters.refreshList(organizationGateway);
}

useHead({ title: "四大中心｜白云 HSD 开发者部落" });
</script>

<template>
  <NuxtPage v-if="route.params.slug" />
  <div v-else>
    <PageBanner
      eyebrow="Four Centers"
      title="研发、传播、策划、成长"
      description="四大中心各有专业方向，也围绕同一个项目目标共同协作。你可以从擅长的方向开始，再逐步探索更多能力。"
      tone="dark"
      media-label="四中心协作关系视觉位"
      :visual="PAGE_VISUALS.centers"
    />
    <section class="section section--warm">
      <div class="shell center-detail-list">
        <OrganizationLeadershipPanel
          v-if="organizationGateway || publicCenters.allianceOwners.length"
          :people="publicCenters.allianceOwners"
          eyebrow="Alliance Leadership"
          heading="联盟负责人"
          role-label="联盟负责人"
          count-label="负责人"
          description="负责联盟级方向、跨中心协作与组织治理。"
          empty-text="当前暂未公布联盟负责人"
          modifier="alliance"
          :loading="publicCenters.apiLoading"
          :error="publicCenters.apiError?.message"
        />
        <NuxtLink
          v-for="center in CENTERS"
          :key="center.slug"
          :to="`/centers/${center.slug}`"
          class="center-detail-row"
        >
          <div>
            <span>{{ center.index }}</span>
            <p>{{ center.role }}</p>
          </div>
          <div>
            <h2>{{ center.title }}</h2>
            <p>{{ center.description }}</p>
          </div>
          <ul>
            <li v-for="topic in center.topics" :key="topic">{{ topic }}</li>
          </ul>
          <strong>查看中心详情 →</strong>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
