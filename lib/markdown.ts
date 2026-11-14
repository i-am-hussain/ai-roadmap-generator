import type { SavedItem } from "./types";
import type { Roadmap } from "./schemas";

function section(title: string, body: string) {
  return `\n## ${title}\n\n${body}\n`;
}

function roadmapToMarkdown(roadmap: Roadmap): string {
  let out = `# ${roadmap.title}\n\n_${roadmap.tagline}_\n\n`;
  out += `**Target role:** ${roadmap.targetRole}  \n`;
  out += `**Level:** ${roadmap.difficulty}  \n`;
  out += `**Commitment:** ${roadmap.totalWeeks} weeks · ${roadmap.weeklyHours} h/week\n`;

  out += section("What you will be able to do", roadmap.outcomes.map((item) => `- ${item}`).join("\n"));

  out += section(
    "Phases",
    roadmap.phases
      .map((phase, index) => {
        const lines: string[] = [];
        lines.push(`### ${String(index + 1).padStart(2, "0")} · ${phase.title} (${phase.duration})`);
        lines.push(`\n_${phase.focus}_\n`);
        lines.push(`**Objectives**\n${phase.objectives.map((o) => `- ${o}`).join("\n")}`);
        lines.push(
          `\n**Tasks**\n${phase.tasks
            .map((task) => `- [ ] ${task.title} — ${task.detail} _(${task.hours}h)_`)
            .join("\n")}`,
        );
        lines.push(`\n**Skills:** ${phase.skills.join(", ")}`);
        lines.push(
          `\n**Resources**\n${phase.resources
            .map((r) =>
              r.url
                ? `- [${r.title}](${r.url}) — ${r.provider}. ${r.why}`
                : `- ${r.title} — ${r.provider}. ${r.why}`,
            )
            .join("\n")}`,
        );
        lines.push(`\n**Build:** ${phase.project.title}\n\n${phase.project.brief}\n\nDeliverable: ${phase.project.deliverable}`);
        lines.push(`\n**Checkpoint:** ${phase.checkpoint}`);
        return lines.join("\n");
      })
      .join("\n\n---\n\n"),
  );

  out += section(
    "Milestones",
    roadmap.milestones.map((m) => `- **Week ${m.week} — ${m.title}:** ${m.proof}`).join("\n"),
  );
  out += section(
    "Final project",
    `**${roadmap.finalProject.title}**\n\n${roadmap.finalProject.brief}\n\nDeliverable: ${roadmap.finalProject.deliverable}\n\nShows: ${roadmap.finalProject.skillsShown.join(", ")}`,
  );
  out += section("Success metrics", roadmap.successMetrics.map((s) => `- ${s}`).join("\n"));
  out += section(
    "Pitfalls",
    roadmap.pitfalls.map((p) => `- **${p.pitfall}** → ${p.fix}`).join("\n"),
  );
  out += section("Next steps", roadmap.nextSteps.map((s) => `- ${s}`).join("\n"));

  return out;
}

export function itemToMarkdown(item: SavedItem): string {
  let out = "";

  if (item.transition) {
    const t = item.transition;
    out += `# ${t.headline}\n\n${t.summary}\n\n`;
    out += `**Feasibility:** ${t.feasibility.score}/100 — ${t.feasibility.label}  \n`;
    out += `**Estimated time to hireable:** ${t.feasibility.estimatedMonths} months  \n`;
    out += `**Why:** ${t.feasibility.reasoning}\n`;

    out += section("Assets you already have", t.currentAssets.map((a) => `- ${a}`).join("\n"));
    out += section(
      "What carries over",
      `| Your skill | Strength | Where it helps | How to prove it |\n| --- | --- | --- | --- |\n${t.transferable
        .map((s) => `| ${s.skill} | ${s.strength} | ${s.whereItHelps} | ${s.proof} |`)
        .join("\n")}`,
    );
    out += section(
      "Gaps to close",
      `| Skill | Priority | Why it matters | Weeks | How to close it |\n| --- | --- | --- | --- | --- |\n${t.gaps
        .map((g) => `| ${g.skill} | ${g.priority} | ${g.why} | ${g.weeks} | ${g.howToClose} |`)
        .join("\n")}`,
    );
    out += section(
      "Bridge roles",
      t.bridgeRoles.map((r) => `- **${r.role}** (${r.fit} fit) — ${r.why}`).join("\n"),
    );
    out += section("Risks", t.risks.map((r) => `- **${r.risk}** → ${r.mitigation}`).join("\n"));
    out += section(
      "Positioning",
      `${t.positioning.narrative}\n\n**Headline:** ${t.positioning.headline}\n\n**Resume bullets**\n${t.positioning.resumeBullets
        .map((b) => `- ${b}`)
        .join("\n")}\n\n**Keywords:** ${t.positioning.keywords.join(", ")}`,
    );
    out += section(
      "Quick wins",
      t.quickWins.map((q) => `- ${q.action} — ${q.why} _(${q.effort})_`).join("\n"),
    );
    out += `\n---\n\n# Your transition roadmap\n\n`;
  }

  out += roadmapToMarkdown(item.roadmap);
  out += `\n\n---\n\n_Generated with Pathforge on ${new Date(item.createdAt).toLocaleDateString()}._\n`;
  return out;
}
