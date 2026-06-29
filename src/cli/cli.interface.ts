import { Area, SortOrder, ViennaDistrict } from "../scraper/scraper.const";
import { OutputFormat } from "../exporter/exporter.interface";

/**
 * Steps for the interactive CLI prompts, mapped to CliSearchOptions keys.
 */
export enum CliPromptStep {
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
	area?: Area[];
	wienDistricts?: ViennaDistrict[];
	limit?: number;
	format?: OutputFormat;
	output?: string;
	sort?: SortOrder | undefined;
	skipDetails?: boolean | undefined;
	quiet?: boolean | undefined;
	failOnEmpty?: boolean | undefined;
	nonInteractive?: boolean | undefined;
}
