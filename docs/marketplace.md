# Willhaben Marktplatz (Marketplace) Scraping Guide

This document contains requirements, behavior, and details for scraping the general Willhaben Marketplace (Kaufen & Verkaufen).

## URL Structure & Endpoints

- Base URL: `https://www.willhaben.at/iad/kaufen-und-verkaufen/`
- Search Endpoint: `https://www.willhaben.at/iad/kaufen-und-verkaufen/marktplatz?keyword={QUERY}`

## Common Filters

- **Keyword (`-q`, `--query`)**: The main search string (e.g., "iphone", "fahrrad").
- **Category**: Specific category IDs (e.g., Smartphones, Cars).
- **Price (`--min-price`, `--max-price`)**: `PRICE_FROM` and `PRICE_TO`.
- **Location**: `areaId` (similar to Immo).
- **PayLivery**: Boolean flag (items with secure checkout and shipping).
- **Condition**: New, Used, Defective.

## Scraping Methodology (Playwright)

1. **Stealth**: As with Immo, `puppeteer-extra-plugin-stealth` is strictly required. Wait for the page to fully load and avoid headless detection.
2. **Data Extraction**:
    - **JSON State**: Willhaben's Next.js state (`__NEXT_DATA__`) is the most reliable way to extract title, price, location, and listing ID.
    - **DOM Selectors**: Look for `a[id^="search-result-entry-header-"]` or similar dynamic classes if JSON parsing fails.
3. **Rate Limiting**: Do not send requests too fast. Add random delays (`page.waitForTimeout(1000 + Math.random() * 2000)`) between pagination to simulate human behavior.
4. **Detail Pages (`--skip-details`)**: By default, we might just want search results. If detail pages are required, navigate to each `href` carefully to avoid being blocked.
