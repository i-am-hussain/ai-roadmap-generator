import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { SavedItem } from "./types";
import type { Roadmap } from "./schemas";

/**
 * Direct PDF rendering (no headless browser) so the export works on a plain Node runtime.
 * Content is laid out in a single flowing column with automatic page breaks.
 */

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.09, 0.1, 0.12);
const MUTED = rgb(0.38, 0.4, 0.44);
const ACCENT = rgb(0.31, 0.42, 0.05);
const RULE = rgb(0.85, 0.86, 0.87);
const SOFT = rgb(0.96, 0.97, 0.95);

/** pdf-lib's standard fonts only encode WinAnsi; drop anything outside it. */
function clean(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "");
}

class Writer {
  doc!: PDFDocument;
  page!: PDFPage;
  regular!: PDFFont;
  bold!: PDFFont;
  italic!: PDFFont;
  y = PAGE_HEIGHT - MARGIN;
  pageNumber = 0;

  static async create(): Promise<Writer> {
    const writer = new Writer();
    writer.doc = await PDFDocument.create();
    writer.regular = await writer.doc.embedFont(StandardFonts.Helvetica);
    writer.bold = await writer.doc.embedFont(StandardFonts.HelveticaBold);
    writer.italic = await writer.doc.embedFont(StandardFonts.HelveticaOblique);
    writer.addPage();
    return writer;
  }

  addPage() {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pageNumber += 1;
    this.y = PAGE_HEIGHT - MARGIN;
  }

  ensure(space: number) {
    if (this.y - space < MARGIN + 24) this.addPage();
  }

  space(value: number) {
    this.y -= value;
  }

  wrap(text: string, font: PDFFont, size: number, width = CONTENT_WIDTH): string[] {
    const words = clean(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);

      // A single word longer than the column (e.g. a URL) is broken by character.
      if (font.widthOfTextAtSize(word, size) > width) {
        let chunk = "";
        for (const char of word) {
          if (font.widthOfTextAtSize(chunk + char, size) > width) {
            lines.push(chunk);
            chunk = char;
          } else {
            chunk += char;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  }

  paragraph(
    text: string,
    options: {
      font?: PDFFont;
      size?: number;
      color?: ReturnType<typeof rgb>;
      lineHeight?: number;
      indent?: number;
      gap?: number;
    } = {},
  ) {
    const font = options.font ?? this.regular;
    const size = options.size ?? 10;
    const color = options.color ?? INK;
    const lineHeight = options.lineHeight ?? size * 1.45;
    const indent = options.indent ?? 0;
    const width = CONTENT_WIDTH - indent;

    for (const line of this.wrap(text, font, size, width)) {
      this.ensure(lineHeight);
      this.page.drawText(line, { x: MARGIN + indent, y: this.y, size, font, color });
      this.y -= lineHeight;
    }
    if (options.gap) this.y -= options.gap;
  }

  bullet(text: string, options: { size?: number; color?: ReturnType<typeof rgb> } = {}) {
    const size = options.size ?? 10;
    this.ensure(size * 1.45);
    this.page.drawText("-", { x: MARGIN + 2, y: this.y, size, font: this.bold, color: ACCENT });
    this.paragraph(text, { size, indent: 14, color: options.color ?? INK });
  }

  sectionTitle(title: string) {
    this.ensure(40);
    this.space(12);
    this.page.drawText(clean(title.toUpperCase()), {
      x: MARGIN,
      y: this.y,
      size: 8.5,
      font: this.bold,
      color: ACCENT,
    });
    this.y -= 8;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.75,
      color: RULE,
    });
    this.y -= 14;
  }

  subheading(title: string, meta?: string) {
    this.ensure(34);
    this.space(8);
    this.paragraph(title, { font: this.bold, size: 12.5, color: INK });
    if (meta) {
      this.paragraph(meta, { size: 8.5, color: MUTED, lineHeight: 12 });
    }
    this.space(3);
  }

  card(title: string, body: string, meta?: string) {
    const lines = this.wrap(body, this.regular, 9.5, CONTENT_WIDTH - 24);
    const titleLines = this.wrap(title, this.bold, 10.5, CONTENT_WIDTH - 24);
    const height = 14 + titleLines.length * 14 + lines.length * 13 + (meta ? 12 : 0);
    this.ensure(height + 10);

    const top = this.y + 4;
    this.page.drawRectangle({
      x: MARGIN,
      y: top - height,
      width: CONTENT_WIDTH,
      height,
      color: SOFT,
    });
    this.page.drawRectangle({ x: MARGIN, y: top - height, width: 2.5, height, color: ACCENT });

    this.y = top - 14;
    for (const line of titleLines) {
      this.page.drawText(line, { x: MARGIN + 12, y: this.y, size: 10.5, font: this.bold, color: INK });
      this.y -= 14;
    }
    for (const line of lines) {
      this.page.drawText(line, { x: MARGIN + 12, y: this.y, size: 9.5, font: this.regular, color: INK });
      this.y -= 13;
    }
    if (meta) {
      this.page.drawText(clean(meta), { x: MARGIN + 12, y: this.y, size: 8.5, font: this.italic, color: MUTED });
      this.y -= 4;
    }
    this.y = top - height - 10;
  }

  task(done: boolean, title: string, detail: string, hours: number) {
    this.ensure(30);
    const size = 9.5;
    const boxY = this.y - 1;
    this.page.drawRectangle({
      x: MARGIN,
      y: boxY,
      width: 8,
      height: 8,
      borderColor: ACCENT,
      borderWidth: 0.9,
      color: done ? ACCENT : rgb(1, 1, 1),
    });
    if (done) {
      this.page.drawText("x", { x: MARGIN + 1.6, y: boxY + 2, size: 6, font: this.bold, color: rgb(1, 1, 1) });
    }

    const titleWidth = CONTENT_WIDTH - 20;
    for (const line of this.wrap(title, this.bold, size, titleWidth)) {
      this.page.drawText(line, { x: MARGIN + 15, y: this.y, size, font: this.bold, color: INK });
      this.y -= 13;
    }
    for (const line of this.wrap(detail, this.regular, 9, titleWidth)) {
      this.page.drawText(line, { x: MARGIN + 15, y: this.y, size: 9, font: this.regular, color: MUTED });
      this.y -= 12;
    }
    this.page.drawText(`${hours}h`, { x: PAGE_WIDTH - MARGIN - 22, y: this.y + 10, size: 8.5, font: this.regular, color: MUTED });
    this.space(4);
  }

  footer(label: string) {
    const pages = this.doc.getPages();
    pages.forEach((page, index) => {
      page.drawLine({
        start: { x: MARGIN, y: MARGIN + 12 },
        end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + 12 },
        thickness: 0.5,
        color: RULE,
      });
      page.drawText(clean(label), { x: MARGIN, y: MARGIN - 2, size: 7.5, font: this.regular, color: MUTED });
      const pageLabel = `Page ${index + 1} of ${pages.length}`;
      const width = this.regular.widthOfTextAtSize(pageLabel, 7.5);
      page.drawText(pageLabel, { x: PAGE_WIDTH - MARGIN - width, y: MARGIN - 2, size: 7.5, font: this.regular, color: MUTED });
    });
  }

  async save(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

function roadmapSections(w: Writer, roadmap: Roadmap, progress: Record<string, boolean>) {
  w.sectionTitle("Outcomes");
  roadmap.outcomes.forEach((outcome) => w.bullet(outcome));

  w.sectionTitle("The plan");
  roadmap.phases.forEach((phase, phaseIndex) => {
    const objectives = phase.objectives ?? [];
    const skills = phase.skills ?? [];
    const tasks = phase.tasks ?? [];
    const resources = phase.resources ?? [];

    w.subheading(
      `Phase ${phaseIndex + 1}: ${phase.title}`,
      `${phase.duration} | ${phase.focus}`,
    );

    if (objectives.length) {
      w.paragraph("Objectives", { font: w.bold, size: 9, color: MUTED });
      objectives.forEach((objective) => w.bullet(objective, { size: 9.5 }));
      w.space(4);
    }

    if (skills.length) w.paragraph(`Skills: ${skills.join(", ")}`, { size: 9, color: MUTED, gap: 6 });

    tasks.forEach((task, taskIndex) => {
      w.task(Boolean(progress[`${phase.id}:${taskIndex}`]), task.title, task.detail, task.hours);
    });

    resources.forEach((resource) => {
      w.card(
        `${resource.title} (${resource.type}, ${resource.provider})`,
        resource.why,
        resource.url || undefined,
      );
    });

    if (phase.project) {
      w.paragraph(`Project: ${phase.project.title}`, { font: w.bold, size: 9.5, gap: 2 });
      w.paragraph(phase.project.brief, { size: 9.5, color: MUTED, gap: 2 });
      w.paragraph(`Deliverable: ${phase.project.deliverable}`, { size: 9.5, gap: 6 });
    }
    if (phase.checkpoint) w.paragraph(`Checkpoint: ${phase.checkpoint}`, { size: 9.5, font: w.italic, color: MUTED });
  });

  w.sectionTitle("Milestones");
  roadmap.milestones.forEach((milestone) => {
    w.bullet(`Week ${milestone.week} - ${milestone.title}: ${milestone.proof}`);
  });

  w.sectionTitle("Final project");
  w.paragraph(roadmap.finalProject.title, { font: w.bold, size: 11 });
  w.paragraph(roadmap.finalProject.brief, { gap: 3 });
  w.paragraph(`Deliverable: ${roadmap.finalProject.deliverable}`, { color: MUTED, gap: 3 });
  w.paragraph(`Skills shown: ${roadmap.finalProject.skillsShown.join(", ")}`, { color: MUTED });

  w.sectionTitle("How to know it worked");
  roadmap.successMetrics.forEach((metric) => w.bullet(metric));

  w.sectionTitle("Pitfalls to avoid");
  roadmap.pitfalls.forEach((pitfall) => {
    w.paragraph(pitfall.pitfall, { font: w.bold, size: 9.5 });
    w.paragraph(pitfall.fix, { size: 9.5, color: MUTED, indent: 12, gap: 4 });
  });

  w.sectionTitle("Next steps");
  roadmap.nextSteps.forEach((step) => w.bullet(step));
}

export async function renderPlanPdf(item: SavedItem): Promise<Uint8Array> {
  const w = await Writer.create();
  const generated = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  w.paragraph("PATHFORGE", { font: w.bold, size: 9, color: ACCENT, lineHeight: 14 });
  w.space(2);
  w.paragraph(item.title, { font: w.bold, size: 21, lineHeight: 26 });
  w.paragraph(item.subtitle, { size: 11, color: MUTED, gap: 6 });

  const roadmap = item.roadmap;
  w.paragraph(
    `${roadmap.targetRole}  |  ${roadmap.difficulty}  |  ${roadmap.totalWeeks} weeks  |  ${roadmap.weeklyHours} h/week`,
    { size: 9, color: MUTED },
  );

  if (item.kind === "transition" && item.transition) {
    const t = item.transition;
    w.sectionTitle("Feasibility");
    w.paragraph(`${t.feasibility.score}/100 - ${t.feasibility.label}`, { font: w.bold, size: 13, color: ACCENT });
    w.paragraph(`Estimated time to employable: ${t.feasibility.estimatedMonths} months`, { size: 9.5, gap: 4 });
    w.paragraph(t.feasibility.reasoning, { size: 9.5, color: MUTED, gap: 6 });
    w.paragraph(t.summary, { size: 10 });

    w.sectionTitle("What you already bring");
    t.currentAssets.forEach((asset) => w.bullet(asset));

    w.sectionTitle("Transferable skills");
    t.transferable.forEach((skill) => {
      w.card(`${skill.skill} (${skill.strength})`, `${skill.whereItHelps} ${skill.proof}`);
    });

    w.sectionTitle("Gaps to close");
    t.gaps.forEach((gap) => {
      w.card(`${gap.skill} (${gap.priority}, ~${gap.weeks} weeks)`, `${gap.why} ${gap.howToClose}`);
    });

    w.sectionTitle("Bridge roles");
    t.bridgeRoles.forEach((role) => w.bullet(`${role.role} (${role.fit} fit): ${role.why}`));

    w.sectionTitle("Positioning");
    w.paragraph(t.positioning.narrative, { size: 9.5, gap: 4 });
    w.paragraph(`Headline: ${t.positioning.headline}`, { font: w.italic, size: 9.5, gap: 4 });
    t.positioning.resumeBullets.forEach((bullet) => w.bullet(bullet));
    w.paragraph(`Keywords: ${t.positioning.keywords.join(", ")}`, { size: 9, color: MUTED, gap: 4 });

    w.sectionTitle("Quick wins");
    t.quickWins.forEach((win) => w.bullet(`${win.action} (${win.effort}): ${win.why}`));

    w.sectionTitle("Risks");
    t.risks.forEach((risk) => w.bullet(`${risk.risk} - ${risk.mitigation}`));

    w.sectionTitle("Your transition roadmap");
  } else {
    w.sectionTitle("Learning roadmap");
    w.space(-6);
  }

  roadmapSections(w, roadmap, item.progress ?? {});

  w.footer(`Pathforge - generated ${generated} - verify resources before relying on them.`);

  w.doc.setTitle(clean(item.title));
  w.doc.setAuthor("Pathforge");
  w.doc.setSubject(item.kind === "transition" ? "Career transition plan" : "Learning roadmap");

  return w.save();
}
