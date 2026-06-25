/**
 * CSV Exporter module to write scraped data to a file.
 */
import { createObjectCsvWriter } from "csv-writer";
import { WillhabenItem } from "../scraper";

/**
 * Exports an array of items to a CSV file.
 *
 * @param items - The array of items to export.
 * @param outputPath - The path to the destination CSV file.
 */
export async function exportToCsv(items: WillhabenItem[], outputPath: string): Promise<void> {
	const csvWriter = createObjectCsvWriter({
		path: outputPath,
		header: [
			{ id: "id", title: "ID" },
			{ id: "title", title: "TITLE" },
			{ id: "price", title: "PRICE" },
			{ id: "url", title: "URL" },
		],
	});

	await csvWriter.writeRecords(items);
}
