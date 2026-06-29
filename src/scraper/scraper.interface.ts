import { Area, SortOrder, ViennaDistrict } from "./scraper.const";

/**
 * Interface representing a scraped item from willhaben.
 */
export interface WillhabenItem {
	id: string;
	title: string;
	price: string;
	url: string;
	description?: string;
	attributes?: string;
}

export type ProgressCallback = (message: string) => void;

/**
 * Options for scraping willhaben.
 */
export interface ScrapeOptions {
	query: string;
	limit?: number;
	priceMin?: number;
	priceMax?: number;
	area?: Area[];
	wienDistricts?: ViennaDistrict[];
	sort?: SortOrder | undefined;
	skipDetails?: boolean | undefined;
	onProgress?: ProgressCallback;
}
