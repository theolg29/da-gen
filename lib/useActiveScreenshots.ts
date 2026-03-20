import { useDAStore } from "@/store/daStore";

/** Returns the screenshots for the currently active page */
export function useActiveScreenshots() {
  const { scrapeResult, activePage } = useDAStore();
  if (!scrapeResult) return null;

  if (activePage === "productList" && scrapeResult.productListScreenshots) {
    return {
      desktop: scrapeResult.productListScreenshots.desktop,
      desktopFull: scrapeResult.productListScreenshots.desktopFull,
      mobile: scrapeResult.productListScreenshots.mobile,
    };
  }

  if (activePage === "product" && scrapeResult.productScreenshots) {
    return {
      desktop: scrapeResult.productScreenshots.desktop,
      desktopFull: scrapeResult.productScreenshots.desktopFull,
      mobile: scrapeResult.productScreenshots.mobile,
    };
  }

  // Default: home page
  return {
    desktop: scrapeResult.screenshots.desktop,
    desktopFull: scrapeResult.screenshots.desktopFull,
    mobile: scrapeResult.screenshots.mobile,
  };
}
