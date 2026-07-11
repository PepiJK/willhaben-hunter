import { WillhabenHunterOutputFormat } from "../exporter/exporter.interface";
import {
	WillhabenHunterArea,
	WillhabenHunterImmoType,
	WillhabenHunterSortOrder,
	WillhabenHunterViennaDistrict,
} from "../scraper/scraper.const";

/**
 * Interface representing the parsed command-line options for the marketplace command.
 */
export interface WillhabenHunterCliMarketplaceOptions {
	query?: string;
	priceMin?: number;
	priceMax?: number;
	area?: WillhabenHunterArea[];
	wienDistricts?: WillhabenHunterViennaDistrict[];
	limit?: number;
	format?: WillhabenHunterOutputFormat;
	output?: string;
	sort?: WillhabenHunterSortOrder;
	skipDetails?: boolean;
	quiet?: boolean;
	failOnEmpty?: boolean;
	nonInteractive?: boolean;
}

/**
 * Interface representing the parsed command-line options for the immo command.
 */
export interface WillhabenHunterCliImmoOptions {
	type?: WillhabenHunterImmoType;
	query?: string;
	priceMin?: number;
	priceMax?: number;
	rooms?: number;
	sizeMin?: number;
	sizeMax?: number;
	area?: WillhabenHunterArea[];
	wienDistricts?: WillhabenHunterViennaDistrict[];
	limit?: number;
	format?: WillhabenHunterOutputFormat;
	output?: string;
	skipDetails?: boolean;
	quiet?: boolean;
	failOnEmpty?: boolean;
	nonInteractive?: boolean;
}
