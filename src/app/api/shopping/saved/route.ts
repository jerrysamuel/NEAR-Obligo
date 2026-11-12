import { NextResponse } from "next/server";
import { ShoppingService } from "@/modules/shopping/shopping.service";

export async function GET() {
  try {
    const saved = ShoppingService.getSavedProducts();
    return NextResponse.json({ success: true, savedProducts: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, notes } = body;
    if (!productId) {
      return NextResponse.json({ success: false, error: "productId is required" }, { status: 400 });
    }
    const saved = await ShoppingService.saveProduct(productId, notes);
    return NextResponse.json({ success: true, savedProduct: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    if (!productId) {
      return NextResponse.json({ success: false, error: "productId is required" }, { status: 400 });
    }
    const success = ShoppingService.removeSavedProduct(productId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
