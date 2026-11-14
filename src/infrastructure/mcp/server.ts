import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { getServiceSupabase } from "@/infrastructure/supabase/client";
import { processInvoice } from "@/lib/pay";
import { NearAuthorisationClient } from "@/infrastructure/near/near-client";

export function createObligoMcpServer() {
  const server = new Server(
    { name: "nearbligo-invoice-payments", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "get_invoices",
        description: "Retrieve invoices and their approval or settlement status",
        inputSchema: { type: "object", properties: { status: { type: "string" }, limit: { type: "number", default: 50 } } },
      },
      {
        name: "get_obligations",
        description: "Retrieve active contractor obligations and agreed payment limits",
        inputSchema: { type: "object", properties: { vendorId: { type: "string" } } },
      },
      {
        name: "evaluate_invoice",
        description: "Evaluate an invoice and attempt settlement only when all policy checks pass; fails closed without live payment credentials",
        inputSchema: { type: "object", properties: { invoiceId: { type: "string" } }, required: ["invoiceId"] },
      },
      {
        name: "get_invoice_events",
        description: "Retrieve the append-only lifecycle events for an invoice",
        inputSchema: { type: "object", properties: { invoiceId: { type: "string" } }, required: ["invoiceId"] },
      },
      {
        name: "emergency_pause",
        description: "Pause or resume automated invoice settlement",
        inputSchema: { type: "object", properties: { paused: { type: "boolean" } }, required: ["paused"] },
      },
      {
        name: "get_permissions",
        description: "List locally recorded NEAR authorization records and their transaction references",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_onchain_permission",
        description: "Read a permission directly from the deployed NEAR mainnet contract",
        inputSchema: { type: "object", properties: { permissionId: { type: "string" } }, required: ["permissionId"] },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    try {
      const admin = getServiceSupabase();

      if (name === "get_permissions") {
        return { content: [{ type: "text", text: JSON.stringify(NearAuthorisationClient.getRecords(), null, 2) }] };
      }
      if (name === "get_onchain_permission") {
        const permission = await NearAuthorisationClient.getOnchainPermission(String(args.permissionId));
        return { content: [{ type: "text", text: JSON.stringify(permission, null, 2) }] };
      }
      if (!admin) throw new Error("Supabase service client is not configured");

      if (name === "get_invoices") {
        let query = admin.from("invoices").select("*, vendors(name), obligations(name)").order("created_at", { ascending: false }).limit(Number(args.limit || 50));
        if (args.status) query = query.eq("status", String(args.status));
        const { data, error } = await query;
        if (error) throw error;
        return { content: [{ type: "text", text: JSON.stringify(data || [], null, 2) }] };
      }

      if (name === "get_obligations") {
        let query = admin.from("obligations").select("*, vendors(name)").order("created_at", { ascending: false });
        if (args.vendorId) query = query.eq("vendor_id", String(args.vendorId));
        const { data, error } = await query;
        if (error) throw error;
        return { content: [{ type: "text", text: JSON.stringify(data || [], null, 2) }] };
      }

      if (name === "get_invoice_events") {
        const { data, error } = await admin
          .from("invoice_events")
          .select("id, invoice_id, event_type, status, payload, created_at")
          .eq("invoice_id", String(args.invoiceId))
          .order("created_at", { ascending: true });
        if (error) throw error;
        return { content: [{ type: "text", text: JSON.stringify(data || [], null, 2) }] };
      }

      if (name === "evaluate_invoice") {
        const result = await processInvoice(String(args.invoiceId));
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      if (name === "emergency_pause") {
        const { error } = await admin.from("agents").update({ soft_paused: Boolean(args.paused) }).neq("status", "destroyed");
        if (error) throw error;
        return { content: [{ type: "text", text: JSON.stringify({ success: true, paused: Boolean(args.paused) }) }] };
      }

      throw new Error(`Unknown MCP tool: ${name}`);
    } catch (err: any) {
      return { isError: true, content: [{ type: "text", text: `Error executing ${name}: ${err.message}` }] };
    }
  });

  return server;
}
