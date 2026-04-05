import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools";

/**
 * Creates and configures a new Petar OS MCP server instance with all tools registered.
 *
 * Each request gets its own server + transport pair (stateless mode) because
 * Next.js Route Handlers are serverless functions — there is no persistent
 * process to hold a stateful session.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "petar-os",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerAllTools(server);

  return server;
}
