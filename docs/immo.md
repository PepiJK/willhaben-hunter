# Willhaben Immobilien (Immo) Scraping Guide

This document contains requirements, behavior, and details for scraping the Willhaben Immobilien (Real Estate) section.

## URL Structure & Endpoints

- Base URL: `https://www.willhaben.at/iad/immobilien/`
- Examples:
    - Renting flats in Vienna: `.../mietwohnungen/mietwohnung-angebote?areaId=900`
    - Buying houses in Graz: `.../haus-kaufen/haus-angebote?areaId=60101`

## Common Filters

When building the URL or using CLI arguments, map these concepts:

- **Type (`--type`)**:
    - `wohnung-mieten` (Flats for rent)
    - `wohnung-kaufen` (Flats for sale)
    - `haus-mieten` (Houses for rent)
    - `haus-kaufen` (Houses for sale) - _Note: The URL path for this is `/haus-kaufen/haus-angebote`, not `haus-kaufen-angebote`._
    - `grundstueck-kaufen` (Land for sale) - _Note: The URL path for this is `/grundstuecke/grundstueck-angebote`._
- **Area (`-a`, `--area`)**: Willhaben often maps areas (like "wien", "graz") to internal `areaId`s. We must either map strings to IDs or use the search endpoint dynamically.
- **Price**: Min/Max price (`PRICE_FROM`, `PRICE_TO`).
- **Rooms**: Min/Max rooms (`NUMBER_OF_ROOMS_FROM`, `NUMBER_OF_ROOMS_TO`).
- **Size**: Living space min/max (`ESTATE_SIZE_LIVING_AREA_FROM`, `ESTATE_SIZE_LIVING_AREA_TO`).

## Scraping Methodology (Playwright)

1. **Stealth is Mandatory**: Willhaben uses aggressive bot protection. Always load Playwright with `puppeteer-extra-plugin-stealth`.
2. **Data Extraction**:
    - **Modern Approach**: Look for the `<script id="__NEXT_DATA__" type="application/json">` tag in the DOM. It contains the fully hydrated JSON state of the search results. This is significantly more robust than parsing HTML elements.
    - **Fallback Approach**: Parse `.Box-sc-...` or `[data-testid="search-result-entry"]` elements via Playwright selectors.
3. **Pagination**:
    - Usually controlled via the `page=X` query parameter.
    - Stop scraping when `limit` is reached or no "Next Page" button/data is found.
