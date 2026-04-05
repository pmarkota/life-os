import { NextRequest } from "next/server";
import { createAuthCode } from "@/lib/oauth/utils";

// ─────────────────────────────────────────────
// GET — Render the authorization login page
// ─────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  const sp = request.nextUrl.searchParams;

  const clientId = sp.get("client_id") || "";
  const redirectUri = sp.get("redirect_uri") || "";
  const responseType = sp.get("response_type") || "";
  const state = sp.get("state") || "";
  const codeChallenge = sp.get("code_challenge") || "";
  const codeChallengeMethod = sp.get("code_challenge_method") || "";

  // Validate required params
  if (responseType !== "code") {
    return errorPage("Invalid request: response_type must be 'code'");
  }
  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return errorPage("Invalid request: PKCE with S256 is required");
  }
  if (!redirectUri) {
    return errorPage("Invalid request: redirect_uri is required");
  }
  if (!clientId) {
    return errorPage("Invalid request: client_id is required");
  }

  // Validate redirect URI
  try {
    const parsed = new URL(redirectUri);
    const isLocalhost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (!isLocalhost && parsed.protocol !== "https:") {
      return errorPage("Invalid redirect_uri: must be localhost or HTTPS");
    }
  } catch {
    return errorPage("Invalid redirect_uri: malformed URL");
  }

  return renderLoginPage({
    clientId,
    redirectUri,
    state,
    codeChallenge,
    codeChallengeMethod,
    error: null,
  });
}

// ─────────────────────────────────────────────
// POST — Handle login form submission
// ─────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  const formData = await request.formData();

  const token = (formData.get("token") as string) || "";
  const clientId = (formData.get("client_id") as string) || "";
  const redirectUri = (formData.get("redirect_uri") as string) || "";
  const state = (formData.get("state") as string) || "";
  const codeChallenge = (formData.get("code_challenge") as string) || "";
  const codeChallengeMethod = (formData.get("code_challenge_method") as string) || "";

  // Verify the token
  const expectedToken = process.env.PETAR_OS_MCP_TOKEN;
  if (!expectedToken || token !== expectedToken) {
    return renderLoginPage({
      clientId,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod,
      error: "Invalid access token. Try again.",
    });
  }

  // Generate signed auth code with PKCE challenge embedded
  const code = createAuthCode({
    codeChallenge,
    codeChallengeMethod,
    redirectUri,
    clientId,
  });

  // Build redirect URL with code and state
  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  if (state) {
    redirect.searchParams.set("state", state);
  }

  return Response.redirect(redirect.toString(), 302);
}

// ─────────────────────────────────────────────
// HTML rendering helpers
// ─────────────────────────────────────────────

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function errorPage(message: string): Response {
  return htmlResponse(
    pageShell(`
      <div class="error-box">${escapeHtml(message)}</div>
      <p style="margin-top:24px;color:#71717A;font-size:14px;">
        Go back and try connecting again.
      </p>
    `),
    400,
  );
}

interface LoginPageParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  error: string | null;
}

function renderLoginPage(params: LoginPageParams): Response {
  const errorHtml = params.error
    ? `<div class="error-box">${escapeHtml(params.error)}</div>`
    : "";

  return htmlResponse(
    pageShell(`
      <div class="badge">Authorization Request</div>
      <h1>PETAR <span class="accent">OS</span></h1>
      <p class="subtitle">
        An application wants to access your MCP server.
      </p>

      <div class="client-info">
        <span class="label">Client</span>
        <span class="value">${escapeHtml(params.clientId).substring(0, 36)}</span>
      </div>

      ${errorHtml}

      <form method="POST" autocomplete="off">
        <input type="hidden" name="client_id" value="${escapeAttr(params.clientId)}" />
        <input type="hidden" name="redirect_uri" value="${escapeAttr(params.redirectUri)}" />
        <input type="hidden" name="state" value="${escapeAttr(params.state)}" />
        <input type="hidden" name="code_challenge" value="${escapeAttr(params.codeChallenge)}" />
        <input type="hidden" name="code_challenge_method" value="${escapeAttr(params.codeChallengeMethod)}" />

        <label for="token">MCP Access Token</label>
        <input
          type="password"
          id="token"
          name="token"
          placeholder="Enter your PETAR_OS_MCP_TOKEN"
          required
          autofocus
        />

        <button type="submit">Authorize</button>
      </form>

      <p class="footer-text">Elevera Studio</p>
    `),
  );
}

function pageShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authorize — PETAR OS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Geist Sans", sans-serif;
      background: #09090B;
      color: #FAFAFA;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }

    .card {
      background: #18181B;
      border: 1px solid #27272A;
      border-radius: 16px;
      padding: 48px 40px;
      max-width: 440px;
      width: 100%;
      text-align: center;
    }

    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #0EA5E9;
      background: rgba(14, 165, 233, 0.12);
      border: 1px solid rgba(14, 165, 233, 0.25);
      border-radius: 6px;
      padding: 4px 12px;
      margin-bottom: 24px;
    }

    h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }

    .accent { color: #0EA5E9; }

    .subtitle {
      color: #A1A1AA;
      font-size: 14px;
      margin-bottom: 28px;
      line-height: 1.5;
    }

    .client-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #111113;
      border: 1px solid #27272A;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 24px;
      font-size: 13px;
    }

    .client-info .label {
      color: #71717A;
      font-weight: 500;
    }

    .client-info .value {
      color: #A1A1AA;
      font-family: "Geist Mono", monospace;
      font-size: 12px;
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    form { text-align: left; }

    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #A1A1AA;
      margin-bottom: 8px;
    }

    input[type="password"] {
      width: 100%;
      padding: 12px 14px;
      background: #09090B;
      border: 1px solid #27272A;
      border-radius: 10px;
      color: #FAFAFA;
      font-size: 14px;
      font-family: "Geist Mono", monospace;
      outline: none;
      transition: border-color 0.15s;
    }

    input[type="password"]:focus {
      border-color: #0EA5E9;
      box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
    }

    input[type="password"]::placeholder {
      color: #3F3F46;
    }

    button {
      display: block;
      width: 100%;
      margin-top: 20px;
      padding: 12px;
      background: #0EA5E9;
      color: #09090B;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.15s;
    }

    button:hover { background: #0284C7; }
    button:active { transform: scale(0.98); }

    .error-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #FCA5A5;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 13px;
      margin-bottom: 20px;
      text-align: center;
    }

    .footer-text {
      margin-top: 32px;
      font-size: 12px;
      color: #3F3F46;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    ${content}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
