import { NextResponse } from "next/server";
import { ShoppingService } from "@/modules/shopping/shopping.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const productIds = body.productIds as string[];

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ success: false, error: "productIds array is required" }, { status: 400 });
    }

    const comparison = await ShoppingService.compareProducts(productIds);
    return NextResponse.json({ success: true, comparison });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
