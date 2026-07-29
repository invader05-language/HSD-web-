export interface GalleryAsset {
  id: string;
  title: string;
  caption: string;
  alt: string;
  aspect: "landscape" | "portrait" | "wide";
  imageUrl?: string;
}

export interface GalleryAlbum {
  slug: string;
  title: string;
  category: "活动摄影" | "海报设计" | "短视频" | "人物专访";
  year: string;
  summary: string;
  team: string;
  assets: readonly GalleryAsset[];
  to: string;
}

const annualActivityAssets: readonly GalleryAsset[] = [
  { id: "annual-01", title: "开场前的最后一次确认", caption: "执行团队核对流程与现场分工", alt: "开场前执行团队确认现场流程", aspect: "landscape" },
  { id: "annual-02", title: "分享与讨论", caption: "讲者和同学围绕实践问题交流", alt: "分享环节中的讲者与听众讨论", aspect: "portrait" },
  { id: "annual-03", title: "签到台准备就绪", caption: "物料、名牌与引导信息完成布置", alt: "活动签到台准备完成", aspect: "portrait" },
  { id: "annual-04", title: "主题分享进行时", caption: "从真实项目出发拆解技术路径", alt: "讲者进行主题分享", aspect: "wide" },
  { id: "annual-05", title: "白板上的思路", caption: "小组把讨论线索整理成行动方案", alt: "小组在白板上梳理思路", aspect: "landscape" },
  { id: "annual-06", title: "并肩调试", caption: "成员共同定位演示前的最后一个问题", alt: "成员并肩调试项目", aspect: "portrait" },
  { id: "annual-07", title: "路演前一分钟", caption: "主讲成员在台侧确认演示节奏", alt: "主讲成员准备项目路演", aspect: "landscape" },
  { id: "annual-08", title: "提问从这里开始", caption: "现场问题让分享延伸到更多实践场景", alt: "听众在分享现场提问", aspect: "wide" },
  { id: "annual-09", title: "工作坊协作现场", caption: "跨方向小组快速完成第一次原型", alt: "工作坊中的小组协作", aspect: "landscape" },
  { id: "annual-10", title: "镜头后的记录者", caption: "媒体成员捕捉活动中的真实片段", alt: "媒体成员记录活动现场", aspect: "portrait" },
  { id: "annual-11", title: "阶段成果合影", caption: "用一张合影标记共同完成的里程碑", alt: "成员展示阶段成果并合影", aspect: "wide" },
  { id: "annual-12", title: "散场后的复盘", caption: "团队趁现场记忆清晰梳理改进事项", alt: "活动结束后的团队复盘", aspect: "landscape" },
  { id: "annual-13", title: "训练营晨间任务", caption: "一天从明确目标和拆分任务开始", alt: "训练营成员查看晨间任务", aspect: "portrait" },
  { id: "annual-14", title: "代码评审一角", caption: "用具体建议帮助伙伴完善实现", alt: "成员进行面对面的代码评审", aspect: "landscape" },
  { id: "annual-15", title: "创意草图铺满桌面", caption: "视觉提案在比较与取舍中逐渐成形", alt: "桌面上铺开的创意草图", aspect: "wide" },
  { id: "annual-16", title: "第一次完整演示", caption: "从需求到作品的链路终于顺畅运行", alt: "项目完成第一次完整演示", aspect: "landscape" },
  { id: "annual-17", title: "感谢每一位参与者", caption: "台前幕后共同组成这一年的活动记忆", alt: "活动参与者和工作人员合影", aspect: "portrait" },
  { id: "annual-18", title: "下一次活动预告", caption: "新的主题正在策划，新的协作即将开始", alt: "团队展示下一次活动预告", aspect: "wide" }
];

export const GALLERY_ALBUMS: readonly GalleryAlbum[] = [
  {
    slug: "annual-activity-record",
    title: "年度活动影像记录",
    category: "活动摄影",
    year: "2026",
    summary: "记录技术分享、项目实训与成员协作的年度现场片段。",
    team: "新媒体中心 · 活动运营组",
    assets: annualActivityAssets,
    to: "/gallery/annual-activity-record"
  },
  {
    slug: "programmer-day-visual-proposal",
    title: "程序员节视觉提案",
    category: "海报设计",
    year: "2026",
    summary: "围绕代码、协作与创造力完成的一组节日品牌视觉探索。",
    team: "新媒体中心 · 视觉设计组",
    assets: [
      { id: "programmer-01", title: "主视觉方向一", caption: "以代码窗口构成节日识别", alt: "程序员节主视觉方向一", aspect: "wide" },
      { id: "programmer-02", title: "字体与网格实验", caption: "寻找技术感与阅读性的平衡", alt: "程序员节字体与网格实验", aspect: "portrait" },
      { id: "programmer-03", title: "应用场景延展", caption: "将视觉语言带到现场物料", alt: "程序员节视觉应用场景", aspect: "landscape" }
    ],
    to: "/gallery/programmer-day-visual-proposal"
  },
  {
    slug: "demo-day-behind-scenes",
    title: "项目路演幕后",
    category: "短视频",
    year: "2026",
    summary: "从排练、调试到登台，呈现项目路演背后的协作过程。",
    team: "新媒体中心 · 视频组",
    assets: [
      { id: "demo-01", title: "脚本围读", caption: "在镜头启动前统一叙事节奏", alt: "团队围读路演视频脚本", aspect: "wide" },
      { id: "demo-02", title: "设备联调", caption: "逐项检查画面、声音和演示信号", alt: "路演前进行设备联调", aspect: "landscape" },
      { id: "demo-03", title: "候场片段", caption: "记录主讲成员登台前的专注时刻", alt: "主讲成员在路演前候场", aspect: "portrait" }
    ],
    to: "/gallery/demo-day-behind-scenes"
  },
  {
    slug: "member-growth-interviews",
    title: "成员成长访谈",
    category: "人物专访",
    year: "2025",
    summary: "听成员讲述从第一次参与到独立负责项目的成长过程。",
    team: "新媒体中心 · 采编组",
    assets: [
      { id: "interview-01", title: "从好奇到行动", caption: "第一次加入项目时的选择与期待", alt: "成员成长访谈第一期", aspect: "portrait" },
      { id: "interview-02", title: "在协作中找到方向", caption: "如何在真实任务中建立自己的方法", alt: "成员成长访谈第二期", aspect: "landscape" },
      { id: "interview-03", title: "把经验交给下一位伙伴", caption: "从参与者成长为带领者", alt: "成员成长访谈第三期", aspect: "wide" }
    ],
    to: "/gallery/member-growth-interviews"
  },
  {
    slug: "tech-salon-live",
    title: "技术沙龙现场",
    category: "活动摄影",
    year: "2025",
    summary: "保留技术沙龙中分享、提问和会后交流的现场温度。",
    team: "新媒体中心 · 摄影组",
    assets: [
      { id: "salon-01", title: "主题开讲", caption: "讲者从一个真实问题展开分享", alt: "技术沙龙主题分享现场", aspect: "wide" },
      { id: "salon-02", title: "现场提问", caption: "观点在问答中得到进一步检验", alt: "技术沙龙现场提问", aspect: "portrait" },
      { id: "salon-03", title: "会后交流", caption: "讨论从会场延续到活动结束之后", alt: "技术沙龙会后交流", aspect: "landscape" }
    ],
    to: "/gallery/tech-salon-live"
  },
  {
    slug: "recruitment-brand-visual",
    title: "招新品牌视觉",
    category: "海报设计",
    year: "2025",
    summary: "用统一而开放的视觉系统介绍团队方向、氛围与加入方式。",
    team: "新媒体中心 · 视觉设计组",
    assets: [
      { id: "recruitment-01", title: "招新主视觉", caption: "以连接和生长表达团队协作", alt: "开发者部落招新主视觉", aspect: "wide" },
      { id: "recruitment-02", title: "方向介绍卡片", caption: "清晰呈现不同中心的实践内容", alt: "招新方向介绍卡片", aspect: "landscape" },
      { id: "recruitment-03", title: "现场导视系统", caption: "让咨询、交流和报名路径更直接", alt: "招新现场导视系统", aspect: "portrait" }
    ],
    to: "/gallery/recruitment-brand-visual"
  }
];

export function findGalleryAlbum(slug: string): GalleryAlbum | undefined {
  return GALLERY_ALBUMS.find((album) => album.slug === slug);
}

export function getGalleryBatch(
  album: GalleryAlbum,
  visibleCount: number
): readonly GalleryAsset[] {
  return album.assets.slice(0, Math.max(0, visibleCount));
}
