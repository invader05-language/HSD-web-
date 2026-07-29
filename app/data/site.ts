export interface NavigationItem {
  label: string;
  to: string;
}

export const SITE_CONFIG = {
  name: "白云 HSD 开发者部落",
  shortName: "< HSD >",
  englishName: "Baiyun HSD Developer Community",
  description:
    "广东白云学院面向技术实践、内容传播、活动策划与成员成长的校园开发者社群。",
  navigation: [
    { label: "首页", to: "/" },
    { label: "部落介绍", to: "/about" },
    { label: "四大中心", to: "/centers" },
    { label: "项目成果", to: "/projects" },
    { label: "活动中心", to: "/activities" },
    { label: "媒体画廊", to: "/gallery" },
    { label: "资源中心", to: "/resources" },
    { label: "考核结果", to: "/assessment-results" },
    { label: "加入我们", to: "/join" }
  ] satisfies NavigationItem[]
} as const;
