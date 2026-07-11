import {
	WillhabenHunterArea,
	WillhabenHunterImmoType,
	WillhabenHunterSortOrder,
	WillhabenHunterViennaDistrict,
} from "./scraper.const";

/**
 * Interface representing a scraped item from willhaben (marketplace or immo).
 */
export interface WillhabenHunterItem {
	id: string;
	title: string;
	price: string;
	url: string;
	description?: string;
	attributes?: string;
}

/**
 * Interface representing a scraped real-estate listing from willhaben Immobilien.
 * Extends the base item with immo-specific fields extracted from the Objektinformationen section.
 */
export interface WillhabenHunterImmoItem extends WillhabenHunterItem {
	rooms?: string;
	livingArea?: string;
	propertyType?: string;
	priceInformation?: string;
	location?: string;
	areaDescription?: string;
	additionalInformation?: string;
	priceAndDetailInformation?: string;
}

export type WillhabenHunterProgressCallback = (message: string) => void;

/**
 * Options for scraping willhaben marketplace (Kaufen & Verkaufen).
 */
export interface WillhabenHunterMarketplaceScrapeOptions {
	query: string;
	limit?: number;
	priceMin?: number;
	priceMax?: number;
	area?: WillhabenHunterArea[];
	wienDistricts?: WillhabenHunterViennaDistrict[];
	sort?: WillhabenHunterSortOrder;
	skipDetails?: boolean;
	onProgress?: WillhabenHunterProgressCallback;
}

/**
 * Options for scraping willhaben Immobilien (real-estate listings).
 */
export interface WillhabenHunterImmoScrapeOptions {
	type: WillhabenHunterImmoType;
	query?: string;
	limit?: number;
	priceMin?: number;
	priceMax?: number;
	/** Minimum number of rooms (maps to NO_OF_ROOMS_BUCKET, semantics: "at least N rooms"). */
	rooms?: number;
	/** Minimum living area in m² (ESTATE_SIZE/LIVING_AREA_FROM). */
	sizeMin?: number;
	/** Maximum living area in m² (ESTATE_SIZE/LIVING_AREA_TO). */
	sizeMax?: number;
	area?: WillhabenHunterArea[];
	wienDistricts?: WillhabenHunterViennaDistrict[];
	skipDetails?: boolean;
	onProgress?: WillhabenHunterProgressCallback;
}
