import { NextRequest, NextResponse } from "next/server";
import { generateExcelTemplate } from "@/lib/excel/importer";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = (searchParams.get("type") || "master") as "master" | "skus" | "retailers";

    const excelBuffer = generateExcelTemplate(type);

    return new NextResponse(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="distributor_${type}_template.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("Template generation error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to generate Excel template." },
      { status: 500 }
    );
  }
}
