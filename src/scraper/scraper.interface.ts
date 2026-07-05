import {
	WillhabenHunterArea,
	WillhabenHunterSortOrder,
	WillhabenHunterViennaDistrict,
} from "./scraper.const";

/**
 * Interface representing a scraped item from willhaben.
 */
export interface WillhabenHunterItem {
	id: string;
	title: string;
	price: string;
	url: string;
	description?: string;
	attributes?: string;
}

export type WillhabenHunterProgressCallback = (message: string) => void;

/**
 * Options for scraping willhaben.
 */
export interface WillhabenHunterScrapeOptions {
	query: string;
	limit?: number;
	priceMin?: number;
	priceMax?: number;
	area?: WillhabenHunterArea[];
	wienDistricts?: WillhabenHunterViennaDistrict[];
	sort?: WillhabenHunterSortOrder | undefined;
	skipDetails?: boolean | undefined;
	onProgress?: WillhabenHunterProgressCallback;
}
