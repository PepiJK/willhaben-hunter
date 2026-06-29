import * as fs from "fs";
import * as path from "path";
import { createObjectCsvStringifier, createObjectCsvWriter } from "csv-writer";
import { WillhabenItem } from "../scraper/scraper.interface";

/** CSV column headers for WillhabenItem export. */
const CSV_HEADERS = [
	{ id: "id", title: "ID" },
	{ id: "title", title: "TITLE" },
	{ id: "price", title: "PRICE" },
	{ id: "url", title: "URL" },
	{ id: "description", title: "DESCRIPTION" },
	{ id: "attributes", title: "ATTRIBUTES" },
];

/**
 * Class for exporting data to CSV.
 */
export class CsvExporter {
	/**
	 * Exports an array of items to a CSV file.
	 *
	 * @param items - The array of items to export.
	 * @param outputPath - The path to the destination CSV file.
	 */
	public static async exportToFile(items: WillhabenItem[], outputPath: string): Promise<void> {
		const dir = path.dirname(outputPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		const csvWriter = createObjectCsvWriter({
			path: outputPath,
			header: CSV_HEADERS,
		});

		await csvWriter.writeRecords(items);
	}

	/**
	 * Serializes an array of items to a CSV string for console output.
	 *
	 * @param items - The array of items to serialize.
	 * @returns The formatted CSV string including headers.
	 */
	public static toConsoleString(items: WillhabenItem[]): string {
		const stringifier = createObjectCsvStringifier({ header: CSV_HEADERS });
		const header = stringifier.getHeaderString() ?? "";
		const records = stringifier.stringifyRecords(items);
		return header + records;
	}
}
