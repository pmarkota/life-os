import { NextRequest } from "next/server";
import {
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/lib/mcp/server";

// ─────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  const token = process.env.PETAR_OS_MCP_TOKEN;
  if (!token) {
    // If the env var is not set, reject everything to avoid an open endpoint
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  // Expect "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return false;

  return parts[1] === token;
}

function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized — invalid or missing bearer token" },
      id: null,
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}

// ─────────────────────────────────────────────
// POST — Main MCP message handler
// ─────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    // Each request gets its own server + transport (stateless mode).
    // This is the correct pattern for serverless environments like Vercel.
    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless — no session tracking
    });

    await server.connect(transport);

    // Pre-parse the body so the transport doesn't try to call .json() again
    const body: unknown = await request.json();

    const response = await transport.handleRequest(request, { parsedBody: body });
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message },
        id: null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// ─────────────────────────────────────────────
// GET — SSE stream for server-initiated messages
// ─────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);

    const response = await transport.handleRequest(request);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message },
        id: null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// ─────────────────────────────────────────────
// DELETE — Session cleanup
// ─────────────────────────────────────────────

export async function DELETE(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  // In stateless mode there is nothing to clean up, but we still let
  // the transport handle it so the protocol response is correct.
  try {
    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);

    const response = await transport.handleRequest(request);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";

    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message },
        id: null,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
