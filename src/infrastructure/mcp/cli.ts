import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createObligoMcpServer } from "./server";

async function run() {
  const server = createObligoMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Obligo MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error running MCP server:", error);
  process.exit(1);
});
