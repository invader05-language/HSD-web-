import { describe, expect, it } from "vitest";
import {
  PUBLIC_RESOURCES,
  findResource,
  resourcePrimaryAction
} from "../../app/data/resources";

describe("public resource details", () => {
  it("publishes one typed detail route for every resource", () => {
    expect(PUBLIC_RESOURCES.map((item) => item.kind)).toEqual([
      "article",
      "article",
      "docx",
      "pdf",
      "archive",
      "external"
    ]);
    expect(PUBLIC_RESOURCES.every((item) => item.to === `/resources/${item.slug}`)).toBe(true);
  });

  it("keeps file actions honest while real files are not connected", () => {
    expect(findResource("project-requirement-template")?.status).toBe("not-connected");
    expect(resourcePrimaryAction(findResource("project-requirement-template")!)).toBe("文件暂未接入");
    expect(findResource("missing")).toBeUndefined();
  });
});
