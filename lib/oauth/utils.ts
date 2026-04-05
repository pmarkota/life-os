import crypto from "crypto";

// ───────────────────────────────��─────────────
// Base URL helper
// ─────────────────────────────────────────────

export function getBaseUrl(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:3000";
  const protocol =
    request.headers.get("x-forwarded-proto") || "http";
  return `${protocol}://${host}`;
}

// ─────────────────────────────────────────────
// PKCE utilities
// ─────────────────────────────────────────────

export function verifyPKCE(
  codeVerifier: string,
  codeChallenge: string,
): boolean {
  const computed = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return computed === codeChallenge;
}

// ─────────────────────────────────────────────
// Stateless signed auth codes
//
// Auth codes are HMAC-signed JSON payloads so they
// survive across serverless invocations without
// shared state. Format: base64url(payload).signature
// ─────────────────────────────────────────────

interface AuthCodePayload {
  code_challenge: string;
  code_challenge_method: string;
  redirect_uri: string;
  client_id: string;
  exp: number; // Unix timestamp
}

function getSecret(): string {
  const secret = process.env.PETAR_OS_MCP_TOKEN;
  if (!secret) throw new Error("PETAR_OS_MCP_TOKEN is not set");
  return secret;
}

export function createAuthCode(params: {
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  clientId: string;
}): string {
  const payload: AuthCodePayload = {
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    redirect_uri: params.redirectUri,
    client_id: params.clientId,
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

export function verifyAuthCode(code: string): AuthCodePayload | null {
  const parts = code.split(".");
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");

  // Constant-time comparison
  if (
    signature.length !== expectedSig.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSig),
    )
  ) {
    return null;
  }

  try {
    const payload: AuthCodePayload = JSON.parse(
      Buffer.from(data, "base64url").toString(),
    );

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
