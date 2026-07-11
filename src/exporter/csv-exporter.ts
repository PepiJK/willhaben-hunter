import * as fs from "fs";
import * as path from "path";
import { createObjectCsvStringifier, createObjectCsvWriter } from "csv-writer";
import { WillhabenHunterImmoItem, WillhabenHunterItem } from "../scraper/scraper.interface";

/** CSV column headers for WillhabenHunterItem (marketplace) export. */
const MARKETPLACE_CSV_HEADERS = [
	{ id: "id", title: "ID" },
	{ id: "title", title: "TITLE" },
	{ id: "price", title: "PRICE" },
	{ id: "url", title: "URL" },
	{ id: "description", title: "DESCRIPTION" },
	{ id: "attributes", title: "ATTRIBUTES" },
];

/** CSV column headers for WillhabenHunterImmoItem export (includes immo-specific fields). */
const IMMO_CSV_HEADERS = [
	{ id: "id", title: "ID" },
	{ id: "title", title: "TITLE" },
	{ id: "price", title: "PRICE" },
	{ id: "url", title: "URL" },
	{ id: "rooms", title: "ROOMS" },
	{ id: "livingArea", title: "LIVING_AREA" },
	{ id: "propertyType", title: "PROPERTY_TYPE" },
	{ id: "description", title: "DESCRIPTION" },
	{ id: "attributes", title: "ATTRIBUTES" },
	{ id: "priceInformation", title: "PRICE_INFORMATION" },
	{ id: "location", title: "LOCATION" },
	{ id: "areaDescription", title: "AREA_DESCRIPTION" },
	{ id: "additionalInformation", title: "ADDITIONAL_INFORMATION" },
	{ id: "priceAndDetailInformation", title: "PRICE_AND_DETAIL_INFORMATION" },
];

/**
 * Class for exporting data to CSV.
 */
export class WillhabenHunterCsvExporter {
	/**
	 * Exports an array of marketplace items to a CSV file.
	 *
	 * @param items - The array of items to export.
	 * @param outputPath - The path to the destination CSV file.
	 */
	public static async exportToFile(
		items: WillhabenHunterItem[],
		outputPath: string,
	): Promise<void> {
		const dir = path.dirname(outputPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		const csvWriter = createObjectCsvWriter({
			path: outputPath,
			header: MARKETPLACE_CSV_HEADERS,
		});

		await csvWriter.writeRecords(items);
	}

	/**
	 * Exports an array of immo items to a CSV file (includes rooms, living area, property type columns).
	 *
	 * @param items - The array of immo items to export.
	 * @param outputPath - The path to the destination CSV file.
	 */
	public static async exportImmoToFile(
		items: WillhabenHunterImmoItem[],
		outputPath: string,
	): Promise<void> {
		const dir = path.dirname(outputPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		const csvWriter = createObjectCsvWriter({
			path: outputPath,
			header: IMMO_CSV_HEADERS,
		});

		await csvWriter.writeRecords(items);
	}

	/**
	 * Serializes an array of marketplace items to a CSV string for console output.
	 *
	 * @param items - The array of items to serialize.
	 * @returns The formatted CSV string including headers.
	 */
	public static toConsoleString(items: WillhabenHunterItem[]): string {
		const stringifier = createObjectCsvStringifier({ header: MARKETPLACE_CSV_HEADERS });
		const header = stringifier.getHeaderString() ?? "";
		const records = stringifier.stringifyRecords(items);
		return header + records;
	}

	/**
	 * Serializes an array of immo items to a CSV string for console output.
	 *
	 * @param items - The array of immo items to serialize.
	 * @returns The formatted CSV string including headers.
	 */
	public static toImmoConsoleString(items: WillhabenHunterImmoItem[]): string {
		const stringifier = createObjectCsvStringifier({ header: IMMO_CSV_HEADERS });
		const header = stringifier.getHeaderString() ?? "";
		const records = stringifier.stringifyRecords(items);
		return header + records;
	}
}
