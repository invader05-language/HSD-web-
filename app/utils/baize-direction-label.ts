export const BAIZE_DIRECTION_LABELS = {
  HARMONYOS_DEVELOPMENT: '鸿蒙开发',
  BACKEND_ARCHITECTURE: '后端架构',
  AIGC_LARGE_MODEL: '大模型 AIGC',
  UI_UX_DESIGN: 'UI/UX 设计',
  EMBEDDED_DEVELOPMENT: '嵌入式开发',
} as const;

export type BaizeDirectionCode = keyof typeof BAIZE_DIRECTION_LABELS;
export type BaizeDirectionLabel = (typeof BAIZE_DIRECTION_LABELS)[BaizeDirectionCode];

export function baizeDirectionLabel(
  code: BaizeDirectionCode | null | undefined,
): BaizeDirectionLabel | undefined {
  return code ? BAIZE_DIRECTION_LABELS[code] : undefined;
}
