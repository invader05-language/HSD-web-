import { describe, expect, it } from "vitest";
import { BAIZE_DIRECTION_LABELS, baizeDirectionLabel } from "../../app/utils/baize-direction-label";

describe("Baize direction presentation", () => {
  it("maps stable API codes to the Chinese labels owned by the frontend", () => {
    expect(BAIZE_DIRECTION_LABELS).toEqual({
      HARMONYOS_DEVELOPMENT: '鸿蒙开发',
      BACKEND_ARCHITECTURE: '后端架构',
      AIGC_LARGE_MODEL: '大模型 AIGC',
      UI_UX_DESIGN: 'UI/UX 设计',
      EMBEDDED_DEVELOPMENT: '嵌入式开发',
    });
    expect(baizeDirectionLabel("BACKEND_ARCHITECTURE")).toBe("后端架构");
    expect(baizeDirectionLabel(null)).toBeUndefined();
  });
});
