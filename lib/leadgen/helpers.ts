// Lead Generator helper functions — ported from leadgen.py

// Croatian cities for cleaning business names
const HR_CITIES = [
  "Zagreb", "Split", "Rijeka", "Osijek", "Dubrovnik", "Zadar",
  "Pula", "Šibenik", "Karlovac", "Varaždin", "Sisak",
  "Slavonski Brod", "Vinkovci", "Bjelovar", "Đakovo",
];

/** Normalize business name for deduplication — full version from Python */
export function cleanBusinessName(name: string): string {
  let cleaned = name;

  // Remove owner info: ", vl RAJKA VADLA" or ", vl. Ivan Horvat"
  cleaned = cleaned.replace(/,?\s*vl\.?\s+[A-ZČĆŠŽĐ][A-ZČĆŠŽĐa-zčćšžđ\s]+$/i, "");

  // Remove addresses stuck in name (street number patterns)
  cleaned = cleaned.replace(/,?\s*\d+[a-zA-Z]?\s*(ul\.|ulica|cesta|put|trg|avenija)\b.*$/i, "");
  cleaned = cleaned.replace(/,?\s*(ul\.|ulica|cesta|put|trg|avenija)\s+.*$/i, "");

  // Remove city names stuck at end
  for (const city of HR_CITIES) {
    const cityRegex = new RegExp(`,?\\s*${city}\\s*$`, "i");
    cleaned = cleaned.replace(cityRegex, "");
  }

  // Remove LLC, Inc., Ltd, Corp, Co.
  cleaned = cleaned.replace(/,?\s*(LLC|Inc\.?|Ltd\.?|Corp\.?|Co\.?|d\.?o\.?o\.?|j\.?d\.?o\.?o\.?)\s*$/i, "");

  // Remove US zip codes (5 or 9 digit)
  cleaned = cleaned.replace(/\s*\d{5}(-\d{4})?\s*$/, "");

  // Remove US state abbreviations at end (2 uppercase letters)
  cleaned = cleaned.replace(/,?\s+[A-Z]{2}\s*$/, "");

  // Fix ALL CAPS — convert to title case
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 2) {
    cleaned = cleaned
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
  }

  // Clean leftover punctuation
  cleaned = cleaned.replace(/[,\-–—]+\s*$/, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

/** Normalize phone number for deduplication */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

// Blacklisted email domains — full list from Python (31 domains)
const EMAIL_BLACKLIST = new Set([
  "wix.com", "wordpress.com", "example.com", "sentry.io", "google.com",
  "facebook.com", "instagram.com", "twitter.com", "youtube.com",
  "w3.org", "schema.org", "googleapis.com", "gstatic.com",
  "mystore.com", "domain.com", "yoursite.com", "yourdomain.com",
  "yourcompany.com", "email.com", "test.com", "sample.com",
  "company.com", "business.com", "website.com", "mail.com",
  "placeholder.com", "noreply.com",
]);

// Bad email prefixes
const BAD_EMAIL_PREFIXES = ["noreply@", "no-reply@", "donotreply@", "mailer-daemon@", "postmaster@"];

/** Decode Cloudflare email protection (`data-cfemail="..."` hex blob).
 * Format: first byte is XOR key, remaining bytes are the email chars. */
function decodeCfEmails(html: string): string[] {
  const decoded: string[] = [];
  const cfRegex = /data-cfemail="([a-f0-9]+)"/gi;
  for (const match of html.matchAll(cfRegex)) {
    const hex = match[1];
    if (hex.length < 4 || hex.length % 2 !== 0) continue;
    try {
      const key = parseInt(hex.substring(0, 2), 16);
      let out = "";
      for (let i = 2; i < hex.length; i += 2) {
        out += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16) ^ key);
      }
      if (out.includes("@")) decoded.push(out);
    } catch {
      // skip malformed
    }
  }
  return decoded;
}

/** Extract email addresses from HTML, filtering blacklisted domains.
 * Also decodes Cloudflare-obfuscated emails. */
export function extractEmail(html: string): string | null {
  const cfEmails = decodeCfEmails(html);
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const regexMatches = html.match(emailRegex) || [];
  const candidates = [...cfEmails, ...regexMatches];

  for (const email of candidates) {
    const lower = email.toLowerCase();
    const domain = lower.split("@")[1];
    if (!domain) continue;

    if (EMAIL_BLACKLIST.has(domain)) continue;
    if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(email)) continue;
    if (BAD_EMAIL_PREFIXES.some((prefix) => lower.startsWith(prefix))) continue;
    if (lower.length > 80) continue;

    return lower;
  }
  return null;
}

// Instagram paths/values to skip — not real profile handles
const INSTAGRAM_SKIP = new Set([
  "p", "reel", "reels", "stories", "explore", "accounts",
  "about", "developer", "legal", "help", "privacy", "terms",
  "embed", "embed.js", "static", "share", "direct", "tv",
  "oembed", "web", "_next", "assets",
]);

/** Extract Instagram profile URL from HTML — iterates ALL matches, skips
 * embeds/posts/scripts, returns first real handle. */
export function extractInstagram(html: string): string | null {
  const patterns = [
    /instagram\.com\/([a-zA-Z0-9_.]+)/gi,
    /\big:\s*@?([a-zA-Z0-9_.]+)/gi,
    /\binstagram:\s*@?([a-zA-Z0-9_.]+)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      if (!match[1]) continue;
      const handle = match[1].toLowerCase().replace(/\.$/, "");
      if (INSTAGRAM_SKIP.has(handle)) continue;
      if (handle.length < 2 || handle.length > 30) continue;
      // Skip file-like handles (e.g. "logo.png" → "logo" after regex, but "embed.js" caught above)
      if (/\.(js|css|png|jpg|jpeg|gif|svg|webp)$/i.test(match[1])) continue;
      return `https://instagram.com/${handle}`;
    }
  }
  return null;
}

// Facebook paths to skip
const FACEBOOK_SKIP = new Set([
  "sharer", "sharer.php", "share", "dialog", "plugins", "tr",
  "flx", "l.php", "login", "groups", "events", "marketplace",
  "watch", "pages", "profile.php", "hashtag",
]);

/** Extract Facebook page URL from HTML — supports facebook.com and fb.com */
export function extractFacebook(html: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9.]+)/i,
    /(?:https?:\/\/)?(?:www\.)?fb\.com\/([a-zA-Z0-9.]+)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const page = match[1].toLowerCase();
      if (FACEBOOK_SKIP.has(page)) continue;
      return `https://facebook.com/${match[1]}`;
    }
  }
  return null;
}

/** Check if URL is a social media link (not a real website) */
export function isSocialMediaUrl(url: string): boolean {
  const socialDomains = [
    "facebook.com", "fb.com", "instagram.com", "linktr.ee",
    "linktree.com", "twitter.com", "x.com", "tiktok.com",
    "youtube.com", "linkedin.com",
  ];
  const lower = url.toLowerCase();
  return socialDomains.some((d) => lower.includes(d));
}

/** Score website quality (0-10, higher = worse website = better lead) */
export function scoreWebsiteQuality(html: string, url: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // No SSL
  if (!url.startsWith("https")) {
    score += 2;
    reasons.push("No SSL");
  }

  // Old copyright year
  const copyrightMatch = html.match(/©\s*(\d{4})/);
  if (copyrightMatch) {
    const year = parseInt(copyrightMatch[1]);
    const currentYear = new Date().getFullYear();
    if (currentYear - year >= 3) {
      score += 3;
      reasons.push(`Copyright ${year}`);
    } else if (currentYear - year >= 1) {
      score += 1;
      reasons.push(`Copyright ${year}`);
    }
  }

  // No viewport meta (not mobile responsive)
  if (!html.includes("viewport")) {
    score += 3;
    reasons.push("Not mobile responsive");
  }

  // Cheap/free website builders
  const lower = html.toLowerCase();
  if (lower.includes("business.site") || url.includes("business.site")) {
    score += 3;
    reasons.push("Google Sites");
  } else if (lower.includes("wixsite.com") || lower.includes("wix.com")) {
    score += 2;
    reasons.push("Wix");
  } else if (lower.includes("godaddysites")) {
    score += 2;
    reasons.push("GoDaddy");
  } else if (lower.includes("weebly.com") || lower.includes("weebly")) {
    score += 2;
    reasons.push("Weebly");
  }

  // Old tech — jQuery version check (1.x or 2.x specifically)
  if (/jquery[\/\-]?[12]\./i.test(lower)) {
    score += 1;
    reasons.push("Outdated jQuery");
  }

  // Bootstrap 3 specific check
  if (/bootstrap[\/\-]?3\./i.test(lower)) {
    score += 1;
    reasons.push("Bootstrap 3");
  }

  // Missing meta description
  if (!lower.includes("meta") || !lower.includes("description")) {
    score += 1;
    reasons.push("No meta description");
  }

  // Missing OG tags
  if (!lower.includes("og:")) {
    score += 1;
    reasons.push("No OG tags");
  }

  return { score, reasons };
}

/** Classify website quality */
export function classifyWebsite(score: number): "GOOD" | "MEDIOCRE" | "BAD_WEB" {
  if (score <= 2) return "GOOD";
  if (score <= 4) return "MEDIOCRE";
  return "BAD_WEB";
}

/** Detect tech stack from HTML */
export function detectTechStack(html: string, url: string): string {
  const lower = html.toLowerCase();
  if (lower.includes("wp-content") || lower.includes("wordpress")) return "WordPress";
  if (lower.includes("wixsite.com") || lower.includes("wix.com")) return "Wix";
  if (lower.includes("squarespace")) return "Squarespace";
  if (lower.includes("shopify")) return "Shopify";
  if (url.includes("business.site")) return "Google Sites";
  if (lower.includes("godaddysites")) return "GoDaddy";
  if (lower.includes("webflow")) return "Webflow";
  if (lower.includes("__next")) return "Next.js";
  if (lower.includes("gatsby")) return "Gatsby";
  return "Custom";
}

// Common words to filter out from owner name extraction
const OWNER_NAME_BLACKLIST = new Set([
  "salon", "studio", "centar", "center", "frizerski", "kozmetički",
  "dental", "fitness", "wellness", "restoran", "apartmani", "hotel",
  "klinika", "ordinacija", "servis", "obrt", "trgovina",
]);

/** Determine best outreach channel */
export function determineChannel(
  market: string,
  email: string | null,
  phone: string | null,
  instagram: string | null,
): string {
  if (market === "hr") {
    if (email) return "email";
    if (phone) return "telefon";
    if (instagram) return "instagram_dm";
    return "telefon";
  }
  // US/UK/DACH
  if (email) return "email";
  if (instagram) return "instagram_dm";
  if (phone) return "telefon";
  return "email";
}

/** Try to extract owner name from snippet and HTML — full 4 HR patterns with filtering */
export function extractOwnerName(snippet: string | null, html: string | null): string | null {
  if (!snippet && !html) return null;

  const text = `${snippet ?? ""} ${html ?? ""}`;

  // Croatian patterns
  const hrPatterns = [
    /vlasni(?:k|ca)\s+([A-ZČĆŠŽĐ][a-zčćšžđ]+(?:\s+[A-ZČĆŠŽĐ][a-zčćšžđ]+)?)/,
    /gospo(?:din|đa|đo)\s+([A-ZČĆŠŽĐ][a-zčćšžđ]+(?:\s+[A-ZČĆŠŽĐ][a-zčćšžđ]+)?)/,
    /vl\.?\s+([A-ZČĆŠŽĐ][a-zčćšžđ]+(?:\s+[A-ZČĆŠŽĐ][a-zčćšžđ]+)?)/,
    /owner[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];

  for (const pattern of hrPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      // Length filtering: each part must be 2-15 chars
      const parts = name.split(/\s+/);
      const validLength = parts.every((p) => p.length >= 2 && p.length <= 15);
      if (!validLength) continue;

      // Common word blacklist
      const hasBlacklisted = parts.some((p) => OWNER_NAME_BLACKLIST.has(p.toLowerCase()));
      if (hasBlacklisted) continue;

      return name;
    }
  }

  return null;
}

/** Contact info subpage paths to try when email not found on homepage — market-specific.
 * Each base path is expanded at fetch time into /path, /path/, and /path.html variants. */
export const CONTACT_SUBPAGES: Record<string, string[]> = {
  hr: [
    "/kontakt", "/contact", "/kontaktirajte-nas", "/about", "/o-nama",
    "/impressum", "/tim", "/nas-tim", "/djelatnici", "/osoblje",
    "/rezervacija", "/rezervacije", "/booking",
  ],
  us: [
    "/contact", "/contact-us", "/about", "/about-us", "/get-in-touch",
    "/team", "/our-team", "/staff", "/meet-the-team", "/meet-us",
    "/doctors", "/stylists", "/book", "/book-now", "/reservations",
  ],
  uk: [
    "/contact", "/contact-us", "/about", "/about-us", "/get-in-touch",
    "/team", "/our-team", "/staff", "/meet-the-team",
    "/doctors", "/stylists", "/book", "/book-now", "/reservations",
  ],
  dach: [
    "/kontakt", "/contact", "/impressum", "/about", "/ueber-uns", "/über-uns",
    "/team", "/unser-team", "/mitarbeiter", "/praxis", "/praxisteam",
    "/buchen", "/termin", "/reservierung",
  ],
};

/** Expand a base path into variants most CMSs serve: no-slash, trailing-slash, .html */
export function expandSubpageVariants(path: string): string[] {
  const base = path.replace(/\/$/, "");
  return [base, `${base}/`, `${base}.html`];
}

/** Check if Croatian text has missing diacritics — ported from Python */
export function hasMissingDiacritics(text: string): boolean {
  const badPatterns = [
    /\bnemas\b/, /\bnemate\b/, /\bzelis\b/, /\bzelite\b/,
    /\bmozes\b/, /\bmozete\b/, /\bzasluzis\b/, /\bzasluzujete\b/,
    /\bodrazava\b/, /\bstrucnost\b/, /\bspecijaliziras\b/,
    /\bzastarjelo\b/, /\bpokazem\b/, /\bpokazemo\b/,
    /\bPostovani\b/, /\bcest\b/, /\bricjetko\b/,
  ];
  return badPatterns.some((p) => p.test(text));
}
