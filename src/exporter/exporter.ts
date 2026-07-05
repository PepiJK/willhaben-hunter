import { WillhabenItem } from "../scraper/scraper.interface";
import { WillhabenHunterCsvExporter } from "./csv-exporter";
import { ExportOptions } from "./exporter.interface";
import { WillhabenHunterJsonExporter } from "./json-exporter";

/**
 * Facade for exporting scraped results in various formats and destinations.
 */
export class WillhabenHunterExporter {
	/**
	 * Exports items based on the given options.
	 *
	 * When `outputPath` is specified, writes to the file and returns the resolved path.
	 * Otherwise, prints to stdout and returns `undefined`.
	 *
	 * @param items - The scraped items to export.
	 * @param options - The format and destination options.
	 * @returns The resolved output file path, or `undefined` if printed to console.
	 */
	public static async export(
		items: WillhabenItem[],
		options: ExportOptions,
	): Promise<string | undefined> {
		if (options.outputPath) {
			return WillhabenHunterExporter._exportToFile(items, options);
		}
		return WillhabenHunterExporter._exportToConsole(items, options);
	}

	private static async _exportToFile(
		items: WillhabenItem[],
		options: ExportOptions,
	): Promise<string> {
		const outputPath = options.outputPath!;

		if (options.format === "csv") {
			await WillhabenHunterCsvExporter.exportToFile(items, outputPath);
		} else {
			await WillhabenHunterJsonExporter.exportToFile(items, outputPath);
		}

		return outputPath;
	}

	private static _exportToConsole(items: WillhabenItem[], options: ExportOptions): undefined {
		const output =
			options.format === "csv"
				? WillhabenHunterCsvExporter.toConsoleString(items)
				: WillhabenHunterJsonExporter.toConsoleString(items);

		process.stdout.write(output);
		return undefined;
	}
}
