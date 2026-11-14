import { NextResponse } from "next/server";
import { createObligoMcpServer } from "@/infrastructure/mcp/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const configured = process.env.MCP_API_TOKEN;
  if (!configured) return false;
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const apiKey = req.headers.get("x-api-key");
  return bearer === configured || apiKey === configured;
}

async function handleMcp(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "MCP authentication required" }, { status: 401 });
  }
  const server = createObligoMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handleMcp;
export const DELETE = handleMcp;

export async function GET() {
  return NextResponse.json({
    status: "active",
    protocol: "mcp/1.0",
    serverName: "nearbligo-invoice-payments",
    description: "Authenticated MCP Streamable HTTP endpoint for invoice payments, permissions, and audit activity.",
    endpoint: "/api/mcp",
    transport: "Streamable HTTP JSON-RPC / stdio",
    availableTools: ["get_invoices", "get_obligations", "get_invoice_events", "evaluate_invoice", "emergency_pause", "get_permissions", "get_onchain_permission"],
  });
}
