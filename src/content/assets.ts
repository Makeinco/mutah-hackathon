type AssetPath = `/${string}`;
type FutureAsset = AssetPath | null;

export type MutahAssetRegistry = {
  brand: {
    logo: AssetPath;
    icon: AssetPath;
  };
  home: {
    heroDesktop: AssetPath;
    heroMobile: AssetPath;
    splashVideo: AssetPath;
  };
  explore: {
    emptyState: FutureAsset;
  };
  facility: {
    officialImageFallback: FutureAsset;
  };
  contribute: {
    captureGuide: FutureAsset;
  };
  ai: {
    evidenceVisual: FutureAsset;
  };
  review: {
    emptyState: FutureAsset;
  };
  shared: {
    emptyState: FutureAsset;
  };
};

export const ASSETS = {
  brand: {
    logo: "/assets/brand/mutah-logo.svg",
    icon: "/assets/brand/mutah-icon.svg",
  },
  home: {
    heroDesktop: "/assets/home/mutah-home-desktop-fullbleed.webp",
    heroMobile: "/assets/home/mutah-home-mobile-fullbleed.webp",
    splashVideo: "/assets/home/mutah-splash-intro.mp4",
  },
  explore: {
    emptyState: null,
  },
  facility: {
    officialImageFallback: null,
  },
  contribute: {
    captureGuide: null,
  },
  ai: {
    evidenceVisual: null,
  },
  review: {
    emptyState: null,
  },
  shared: {
    emptyState: null,
  },
} as const satisfies MutahAssetRegistry;

// Backward-compatible name used by the approved Home implementation.
export const MUTAH_ASSETS = ASSETS;

export type MutahAssetGroup = keyof typeof ASSETS;
