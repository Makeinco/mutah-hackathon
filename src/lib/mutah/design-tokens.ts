/**
 * CSS variables remain MUTAH's runtime styling system. These typed tokens document
 * and centralize the semantic values used when developing components.
 */
export const MUTAH_DESIGN_TOKENS = {
  color: {
    brand: {
      blue: "#0066FF",
      green: "#00FF00",
    },
    semantic: {
      background: "var(--background)",
      surface: "var(--surface)",
      textPrimary: "var(--foreground)",
      textSecondary: "var(--muted-foreground)",
      border: "var(--border)",
      primary: "var(--primary)",
      primarySoft: "var(--primary-soft)",
      access: "var(--access)",
      accessStrong: "var(--access-strong)",
      accessSoft: "var(--access-soft)",
      caution: "var(--caution)",
      unknown: "var(--unknown)",
      destructive: "var(--destructive)",
    },
  },
  spacing: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
  },
  radius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
    xl: "var(--radius-xl)",
    "2xl": "var(--radius-2xl)",
    full: "9999px",
  },
  motion: {
    fast: "180ms",
    normal: "520ms",
    slow: "700ms",
    easeStandard: "ease",
    easeEmphasized: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  },
  layout: {
    contentMax: "80rem",
    wideMax: "90rem",
    headerHeightDesktop: "4.25rem",
    headerHeightMobile: "3.625rem",
    bottomNavHeight: "4rem",
    mobilePagePadding: "1rem",
    desktopPagePadding: "1.5rem",
  },
  typography: {
    heroDesktop: "4rem",
    heroMobile: "2.25rem",
    h2Desktop: "2.25rem",
    h2Mobile: "1.75rem",
    bodyLarge: "1.25rem",
    body: "1rem",
    caption: "0.75rem",
  },
} as const;

export type MutahDesignTokens = typeof MUTAH_DESIGN_TOKENS;
