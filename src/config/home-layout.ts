import { MUTAH_DESIGN_TOKENS } from "@/lib/mutah/design-tokens";

type ImageFit = "contain" | "cover";

type HeroViewportLayout = {
  imageFit: ImageFit;
  imagePosition: string;
  imageScale: number;
};

export type HomeLayoutConfig = {
  hero: {
    desktop: HeroViewportLayout & {
      heightBase: string;
      heightWide: string;
      heightVeryWide: string;
      contentMaxWidth: string;
      contentInset: string;
      contentVerticalPosition: string;
      topBlendHeight: string;
      topBlendOpacity: number;
      topBlend: string;
      contentVeilWidth: string;
      contentVeilOpacity: number;
      contentVeil: string;
      radialHazeWidth: string;
      radialHazeHeight: string;
      radialHazePosition: string;
      radialHazeOpacity: number;
      radialHaze: string;
      lowerFadeHeight: string;
      lowerFadeOpacity: number;
      lowerFade: string;
      titleMin: string;
      titleFluid: string;
      titleMax: string;
      searchHeight: string;
      buttonHeight: string;
    };
    tablet: HeroViewportLayout & {
      visualHeight: string;
      visualToContentGap: string;
    };
    mobile: HeroViewportLayout & {
      visualHeightMin: string;
      visualHeightFluid: string;
      visualHeightMax: string;
      imageHeightSmall: string;
      imageHeightLarge: string;
      archCenterX: string;
      topBlendHeight: string;
      topBlendOpacity: number;
      topBlend: string;
      lowerFadeHeight: string;
      lowerFadeOpacity: number;
      lowerFade: string;
      titleMin: string;
      titleFluid: string;
      titleMax: string;
      searchHeight: string;
      buttonHeight: string;
      visualToContentGap: string;
      ctaToRecentGap: string;
    };
  };
  sections: {
    recentTopGapDesktop: string;
    howItWorksPaddingDesktop: string;
    howItWorksPaddingMobile: string;
    aiPaddingDesktop: string;
    aiPaddingMobile: string;
    contributionPaddingDesktop: string;
    contributionPaddingMobile: string;
    footerPaddingDesktop: string;
    footerPaddingMobile: string;
  };
  cards: {
    desktopCount: number;
    mobileInitialCount: number;
  };
};

/**
 * Home-only composition controls. Marketing copy, asset paths, and global design
 * semantics intentionally remain in their dedicated content, asset, and token modules.
 */
export const HOME_LAYOUT = {
  hero: {
    desktop: {
      heightBase: "720px",
      heightWide: "800px",
      heightVeryWide: "900px",
      contentMaxWidth: "430px",
      contentInset: "max(2rem, calc((100vw - 1280px) / 2))",
      contentVerticalPosition: "51%",
      imageFit: "cover",
      imagePosition: "center center",
      imageScale: 1,
      topBlendHeight: "5rem",
      topBlendOpacity: 0.72,
      topBlend:
        "linear-gradient(to bottom, rgba(255,255,255,.72) 0%, rgba(255,255,255,.2) 46%, rgba(255,255,255,0) 100%)",
      contentVeilWidth: "43%",
      contentVeilOpacity: 0.94,
      contentVeil:
        "linear-gradient(90deg, rgba(255,255,255,.97) 0%, rgba(255,255,255,.9) 42%, rgba(255,255,255,.52) 72%, rgba(255,255,255,0) 100%)",
      radialHazeWidth: "48%",
      radialHazeHeight: "88%",
      radialHazePosition: "0% 50%",
      radialHazeOpacity: 0.56,
      radialHaze:
        "radial-gradient(ellipse at 30% 50%, rgba(255,255,255,.86) 0%, rgba(255,255,255,.34) 52%, rgba(255,255,255,0) 78%)",
      lowerFadeHeight: "3.75rem",
      lowerFadeOpacity: 0.46,
      lowerFade:
        "linear-gradient(to top, rgba(255,255,255,.62) 0%, rgba(255,255,255,.16) 48%, rgba(255,255,255,0) 100%)",
      titleMin: "3.25rem",
      titleFluid: "4.15vw",
      titleMax: MUTAH_DESIGN_TOKENS.typography.heroDesktop,
      searchHeight: "3.375rem",
      buttonHeight: "3.125rem",
    },
    tablet: {
      visualHeight: "340px",
      imageFit: "cover",
      imagePosition: "center",
      imageScale: 1,
      visualToContentGap: "1.25rem",
    },
    mobile: {
      visualHeightMin: "18rem",
      visualHeightFluid: "82vw",
      visualHeightMax: "22rem",
      imageHeightSmall: "100%",
      imageHeightLarge: "100%",
      imageFit: "cover",
      imagePosition: "center 48%",
      imageScale: 1,
      archCenterX: "50%",
      topBlendHeight: "3.25rem",
      topBlendOpacity: 0.5,
      topBlend:
        "linear-gradient(to bottom, rgba(255,255,255,.64) 0%, rgba(255,255,255,.12) 52%, rgba(255,255,255,0) 100%)",
      lowerFadeHeight: "4.5rem",
      lowerFadeOpacity: 0.78,
      lowerFade:
        "linear-gradient(to top, rgba(255,255,255,.92) 0%, rgba(255,255,255,.28) 48%, rgba(255,255,255,0) 100%)",
      titleMin: "2.25rem",
      titleFluid: "9.5vw",
      titleMax: "2.625rem",
      searchHeight: "3.125rem",
      buttonHeight: "3.125rem",
      visualToContentGap: "0.875rem",
      ctaToRecentGap: "3rem",
    },
  },
  sections: {
    recentTopGapDesktop: "3.5rem",
    howItWorksPaddingDesktop: "5rem",
    howItWorksPaddingMobile: "3.5rem",
    aiPaddingDesktop: "6rem",
    aiPaddingMobile: "4rem",
    contributionPaddingDesktop: "2.5rem",
    contributionPaddingMobile: "2rem",
    footerPaddingDesktop: "2.25rem",
    footerPaddingMobile: "2rem",
  },
  cards: {
    desktopCount: 3,
    mobileInitialCount: 2,
  },
} as const satisfies HomeLayoutConfig;
