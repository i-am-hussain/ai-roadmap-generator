import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { renderPlanPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

type Context = { params: Promise<{ id: string }> };

function filename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `${slug || "roadmap"}.pdf`;
}

export async function GET(_request: NextRequest, { params }: Context) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to download this plan.", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { id } = await params;
  const item = await getPlan(user.id, id);
  if (!item) return NextResponse.json({ error: "Plan not found.", code: "NOT_FOUND" }, { status: 404 });

  try {
    const bytes = await renderPlanPdf(item);
    return new NextResponse(new Blob([bytes as BlobPart], { type: "application/pdf" }), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${filename(item.title)}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[pdf] render failed", error);
    return NextResponse.json({ error: "Could not build the PDF.", code: "PDF_ERROR" }, { status: 500 });
  }
}
