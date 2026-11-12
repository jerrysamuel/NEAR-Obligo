import { NextResponse } from "next/server";
import { createObligoMcpServer } from "@/infrastructure/mcp/server";

export async function GET() {
  return NextResponse.json({
    status: "active",
    protocol: "mcp/1.0",
    serverName: "obligo-personal-commerce-agent",
    description: "Model Context Protocol interface for Obligo Private Commerce & Subscriptions",
    endpoint: "/api/mcp",
    transport: "HTTP JSON-RPC / stdio available",
    availableToolGroups: ["shopping", "subscriptions", "privacy", "permissions"],
  });
}
