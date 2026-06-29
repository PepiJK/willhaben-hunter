/**
 * JSON Exporter module to write scraped data to a file or stdout.
 */
import * as fs from "fs";
import * as path from "path";
import { WillhabenItem } from "../scraper/scraper.interface";

/**
 * Class for exporting data as JSON.
 */
export class JsonExporter {
	/**
	 * Exports an array of items to a JSON file.
	 *
	 * @param items - The array of items to export.
	 * @param outputPath - The path to the destination JSON file.
	 */
	public static async exportToFile(items: WillhabenItem[], outputPath: string): Promise<void> {
		const dir = path.dirname(outputPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), "utf-8");
	}

	/**
	 * Serializes an array of items to a JSON string for console output.
	 *
	 * @param items - The array of items to serialize.
	 * @returns The formatted JSON string.
	 */
	public static toConsoleString(items: WillhabenItem[]): string {
		return JSON.stringify(items, null, 2);
	}
}
