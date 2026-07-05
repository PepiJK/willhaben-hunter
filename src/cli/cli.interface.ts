import { OutputFormat } from "../exporter/exporter.interface";
import {
	WillhabenHunterArea,
	WillhabenHunterSortOrder,
	WillhabenHunterViennaDistrict,
} from "../scraper/scraper.const";

/**
 * Steps for the interactive CLI prompts, mapped to CliSearchOptions keys.
 */
export enum WillhabenHunterCliPromptStep {
	QUERY = "query",
	PRICE_MIN = "priceMin",
	PRICE_MAX = "priceMax",
	AREA = "area",
	WIEN_DISTRICTS = "wienDistricts",
	LIMIT = "limit",
}

/**
 * Interface representing the parsed command-line options for the search command.
 */
export interface CliSearchOptions {
	query?: string;
	priceMin?: number;
	priceMax?: number;
	area?: WillhabenHunterArea[];
	wienDistricts?: WillhabenHunterViennaDistrict[];
	limit?: number;
	format?: OutputFormat;
	output?: string;
	sort?: WillhabenHunterSortOrder | undefined;
	skipDetails?: boolean | undefined;
	quiet?: boolean | undefined;
	failOnEmpty?: boolean | undefined;
	nonInteractive?: boolean | undefined;
}
