import { describe, expect, it } from "vitest";
import { renderBrief } from "./client-utils";

describe("renderBrief", () => {
  it("renders a line followed by bullets as a paragraph and a list", () => {
    expect(renderBrief("How people help:\n- **staying** on trails\n- cleaning boots")).toBe("<p>How people help:</p><ul><li><strong>staying</strong> on trails</li><li>cleaning boots</li></ul>");
  });
  it("escapes HTML", () => {
    expect(renderBrief("<script>alert(1)</script>")).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });
  it("handles headings and separate paragraphs", () => {
    expect(renderBrief("## Title\n\nOne\ntwo")).toBe("<h3>Title</h3><p>One<br/>two</p>");
  });
});
