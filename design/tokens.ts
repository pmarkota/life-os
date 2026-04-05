export const tokens = {
  colors: {
    primary: "#0EA5E9", // sky-500 — electric blue accent
    primaryHover: "#0284C7", // sky-600
    primaryMuted: "rgba(14, 165, 233, 0.15)", // for subtle backgrounds
    secondary: "#06B6D4", // cyan-500 — teal secondary
    secondaryHover: "#0891B2", // cyan-600

    background: "#09090B", // zinc-950 — deep dark page bg
    surface: "#18181B", // zinc-900 — card/section bg
    surfaceHover: "#27272A", // zinc-800 — hover state
    elevated: "#1E1E22", // slightly lighter than surface

    text: "#FAFAFA", // zinc-50 — primary text (soft white)
    textSecondary: "#A1A1AA", // zinc-400 — secondary text
    textMuted: "#71717A", // zinc-500 — muted/tertiary text
    textInverse: "#09090B", // for text on primary buttons

    border: "#27272A", // zinc-800 — subtle card borders
    borderHover: "#3F3F46", // zinc-700 — hover borders
    borderActive: "#0EA5E9", // primary — active/focus borders

    success: "#22C55E", // green-500
    warning: "#F59E0B", // amber-500
    error: "#EF4444", // red-500
    info: "#0EA5E9", // sky-500

    // Status colors for CRM pipeline
    statusNew: "#0EA5E9",
    statusContacted: "#8B5CF6",
    statusFollowUp: "#F59E0B",
    statusDemo: "#06B6D4",
    statusWon: "#22C55E",
    statusLost: "#EF4444",
  },
  fonts: {
    heading: "var(--font-geist-sans)",
    body: "var(--font-geist-sans)",
    mono: "var(--font-geist-mono)",
  },
  spacing: {
    sectionY: "py-24 md:py-32",
    containerX: "px-6 md:px-12 lg:px-24",
    maxWidth: "max-w-6xl",
  },
  radius: {
    sm: "rounded-md",
    md: "rounded-xl",
    lg: "rounded-2xl",
  },
  shadows: {
    subtle: "shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
    medium: "shadow-[0_8px_30px_rgba(0,0,0,0.3)]",
  },
} as const;

export type Tokens = typeof tokens;
