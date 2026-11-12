import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { SubscriptionService } from "@/modules/subscriptions/subscription.service";
import { SubscriptionInsightsEngine } from "@/modules/subscriptions/subscription-insights";
import { ShoppingService } from "@/modules/shopping/shopping.service";
import { PermissionService } from "@/modules/privacy/permission.service";
import { MemoryService } from "@/modules/memory/memory.service";
import { store } from "@/infrastructure/store/persistent-store";

export function createObligoMcpServer() {
  const server = new Server(
    {
      name: "obligo-personal-commerce-agent",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Shopping tools
        {
          name: "search_products",
          description: "Search supported merchants for products (laptops, tech gear, etc.)",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query or natural language criteria" },
              maxPrice: { type: "number", description: "Maximum price filter in local currency" },
            },
            required: ["query"],
          },
        },
        {
          name: "compare_products",
          description: "Compare selected products side-by-side across specifications and prices",
          inputSchema: {
            type: "object",
            properties: {
              productIds: {
                type: "array",
                items: { type: "string" },
                description: "Array of product IDs to compare",
              },
            },
            required: ["productIds"],
          },
        },
        {
          name: "get_product_details",
          description: "Retrieve comprehensive specifications and verified availability for a product",
          inputSchema: {
            type: "object",
            properties: {
              productId: { type: "string" },
            },
            required: ["productId"],
          },
        },
        {
          name: "save_product",
          description: "Save a product to the user's private shopping shortlist",
          inputSchema: {
            type: "object",
            properties: {
              productId: { type: "string" },
              notes: { type: "string" },
            },
            required: ["productId"],
          },
        },
        {
          name: "prepare_purchase",
          description: "Prepare checkout requirements and register purchase intent",
          inputSchema: {
            type: "object",
            properties: {
              productId: { type: "string" },
              quantity: { type: "number", default: 1 },
            },
            required: ["productId"],
          },
        },
        // Subscription tools
        {
          name: "list_subscriptions",
          description: "List the authenticated user's recurring subscriptions",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "add_subscription",
          description: "Create a new recurring subscription commitment",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string" },
              provider: { type: "string" },
              category: { type: "string" },
              amount: { type: "number" },
              currency: { type: "string", default: "NGN" },
              billingCycle: { type: "string", enum: ["weekly", "monthly", "quarterly", "yearly"] },
              nextBillingDate: { type: "string", description: "YYYY-MM-DD" },
              notes: { type: "string" },
            },
            required: ["name", "provider", "category", "amount", "billingCycle", "nextBillingDate"],
          },
        },
        {
          name: "get_upcoming_renewals",
          description: "Retrieve subscriptions due for renewal within a given timeframe",
          inputSchema: {
            type: "object",
            properties: {
              days: { type: "number", default: 30 },
            },
          },
        },
        {
          name: "get_recurring_spend",
          description: "Calculate normalized monthly and annual recurring expense totals",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "get_subscription_insights",
          description: "Generate AI & deterministic insights on recurring commitments and potential savings",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "discover_crypto_streams",
          description: "Discover recurring on-chain crypto streaming subscriptions (Superfluid CFA streams)",
          inputSchema: {
            type: "object",
            properties: {
              walletAddress: { type: "string", description: "Optional EVM / Superfluid wallet address" },
            },
          },
        },
        // Privacy and Permissions
        {
          name: "get_private_preferences",
          description: "Retrieve permitted shopping preferences, spending limits, and brands",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "get_permissions",
          description: "List active disclosure permissions and authorization boundaries",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "approve_disclosure",
          description: "Approve disclosure of specific fields to a designated merchant recipient",
          inputSchema: {
            type: "object",
            properties: {
              recipient: { type: "string" },
              purpose: { type: "string" },
              permittedFields: { type: "array", items: { type: "string" } },
              expiresInHours: { type: "number", default: 168 },
            },
            required: ["recipient", "purpose", "permittedFields"],
          },
        },
        {
          name: "revoke_permission",
          description: "Revoke an existing disclosure permission immediately",
          inputSchema: {
            type: "object",
            properties: {
              permissionId: { type: "string" },
            },
            required: ["permissionId"],
          },
        },
        {
          name: "get_activity_history",
          description: "Audit trail of agent and user actions",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    };
  });

  // Call tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "search_products": {
          const results = await ShoppingService.search(
            String(args.query || ""),
            args.maxPrice ? Number(args.maxPrice) : undefined
          );
          return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
        }
        case "compare_products": {
          const comparison = await ShoppingService.compareProducts((args.productIds as string[]) || []);
          return { content: [{ type: "text", text: JSON.stringify(comparison, null, 2) }] };
        }
        case "get_product_details": {
          const product = await ShoppingService.getProduct(String(args.productId));
          return { content: [{ type: "text", text: JSON.stringify(product, null, 2) }] };
        }
        case "save_product": {
          const saved = await ShoppingService.saveProduct(
            String(args.productId),
            args.notes ? String(args.notes) : undefined
          );
          return { content: [{ type: "text", text: JSON.stringify(saved, null, 2) }] };
        }
        case "prepare_purchase": {
          const result = await ShoppingService.preparePurchase(
            String(args.productId),
            args.quantity ? Number(args.quantity) : 1
          );
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
        case "list_subscriptions": {
          const subs = SubscriptionService.getAll();
          return { content: [{ type: "text", text: JSON.stringify(subs, null, 2) }] };
        }
        case "add_subscription": {
          const newSub = SubscriptionService.create({
            name: String(args.name),
            provider: String(args.provider),
            category: String(args.category),
            amount: Number(args.amount),
            currency: String(args.currency || "NGN"),
            billingCycle: args.billingCycle as any,
            nextBillingDate: String(args.nextBillingDate),
            status: "active",
            notes: args.notes ? String(args.notes) : undefined,
            userId: store.getDefaultUserId(),
          });
          return { content: [{ type: "text", text: JSON.stringify(newSub, null, 2) }] };
        }
        case "get_upcoming_renewals": {
          const renewals = SubscriptionService.getUpcomingRenewals(args.days ? Number(args.days) : 30);
          return { content: [{ type: "text", text: JSON.stringify(renewals, null, 2) }] };
        }
        case "get_recurring_spend": {
          const stats = SubscriptionService.getStats();
          return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
        }
        case "get_subscription_insights": {
          const insights = SubscriptionInsightsEngine.generateInsights();
          return { content: [{ type: "text", text: JSON.stringify(insights, null, 2) }] };
        }
        case "discover_crypto_streams": {
          const { SuperfluidStreamConnector } = await import("@/modules/subscriptions/crypto-stream.connector");
          const streams = await SuperfluidStreamConnector.discoverStreams(args.walletAddress ? String(args.walletAddress) : undefined);
          return { content: [{ type: "text", text: JSON.stringify(streams, null, 2) }] };
        }
        case "get_private_preferences": {
          const prefs = MemoryService.getPreferences();
          return { content: [{ type: "text", text: JSON.stringify(prefs, null, 2) }] };
        }
        case "get_permissions": {
          const perms = PermissionService.getAll();
          return { content: [{ type: "text", text: JSON.stringify(perms, null, 2) }] };
        }
        case "approve_disclosure": {
          const perm = PermissionService.grant({
            recipient: String(args.recipient),
            purpose: String(args.purpose),
            requestedFields: (args.permittedFields as string[]) || [],
            expiresInHours: args.expiresInHours ? Number(args.expiresInHours) : 168,
          });
          return { content: [{ type: "text", text: JSON.stringify(perm, null, 2) }] };
        }
        case "revoke_permission": {
          const success = PermissionService.revoke(String(args.permissionId));
          return { content: [{ type: "text", text: JSON.stringify({ success }) }] };
        }
        case "get_activity_history": {
          const logs = store.getActivityLogs();
          return { content: [{ type: "text", text: JSON.stringify(logs, null, 2) }] };
        }
        default:
          throw new Error(`Unknown MCP tool: ${name}`);
      }
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error executing ${name}: ${err.message}` }],
      };
    }
  });

  return server;
}
