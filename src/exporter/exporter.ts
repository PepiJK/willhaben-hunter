import {
	WillhabenHunterImmoItem,
	WillhabenHunterItem,
	WillhabenHunterJobsItem,
} from "../scraper/scraper.interface";
import { WillhabenHunterCsvExporter } from "./csv-exporter";
import { WillhabenHunterExportOptions } from "./exporter.interface";
import { WillhabenHunterJsonExporter } from "./json-exporter";

/**
 * Facade for exporting scraped results in various formats and destinations.
 * Supports both marketplace items and immo items.
 */
export class WillhabenHunterExporter {
	/**
	 * Exports marketplace items based on the given options.
	 *
	 * When `outputPath` is specified, writes to the file and returns the resolved path.
	 * Otherwise, prints to stdout and returns `undefined`.
	 *
	 * @param items - The scraped marketplace items to export.
	 * @param options - The format and destination options.
	 * @returns The resolved output file path, or `undefined` if printed to console.
	 */
	public static async export(
		items: WillhabenHunterItem[],
		options: WillhabenHunterExportOptions,
	): Promise<string | undefined> {
		if (options.outputPath) {
			return WillhabenHunterExporter._exportToFile(items, options);
		}
		return WillhabenHunterExporter._exportToConsole(items, options);
	}

	/**
	 * Exports immo items based on the given options.
	 * Uses immo-specific CSV columns when exporting to CSV.
	 *
	 * When `outputPath` is specified, writes to the file and returns the resolved path.
	 * Otherwise, prints to stdout and returns `undefined`.
	 *
	 * @param items - The scraped immo items to export.
	 * @param options - The format and destination options.
	 * @returns The resolved output file path, or `undefined` if printed to console.
	 */
	public static async exportImmo(
		items: WillhabenHunterImmoItem[],
		options: WillhabenHunterExportOptions,
	): Promise<string | undefined> {
		if (options.outputPath) {
			return WillhabenHunterExporter._exportImmoToFile(items, options);
		}
		return WillhabenHunterExporter._exportImmoToConsole(items, options);
	}

	/**
	 * Exports jobs items based on the given options.
	 * Uses jobs-specific CSV columns when exporting to CSV.
	 *
	 * When `outputPath` is specified, writes to the file and returns the resolved path.
	 * Otherwise, prints to stdout and returns `undefined`.
	 *
	 * @param items - The scraped jobs items to export.
	 * @param options - The format and destination options.
	 * @returns The resolved output file path, or `undefined` if printed to console.
	 */
	public static async exportJobs(
		items: WillhabenHunterJobsItem[],
		options: WillhabenHunterExportOptions,
	): Promise<string | undefined> {
		if (options.outputPath) {
			return WillhabenHunterExporter._exportJobsToFile(items, options);
		}
		return WillhabenHunterExporter._exportJobsToConsole(items, options);
	}

	private static async _exportToFile(
		items: WillhabenHunterItem[],
		options: WillhabenHunterExportOptions,
	): Promise<string> {
		const outputPath = options.outputPath!;

		if (options.format === "csv") {
			await WillhabenHunterCsvExporter.exportToFile(items, outputPath);
		} else {
			await WillhabenHunterJsonExporter.exportToFile(items, outputPath);
		}

		return outputPath;
	}

	private static _exportToConsole(
		items: WillhabenHunterItem[],
		options: WillhabenHunterExportOptions,
	): Promise<undefined> {
		const output =
			options.format === "csv"
				? WillhabenHunterCsvExporter.toConsoleString(items)
				: WillhabenHunterJsonExporter.toConsoleString(items);

		return new Promise((resolve, reject) => {
			process.stdout.write(output + "\n", (err) => {
				if (err) reject(err);
				else resolve(undefined);
			});
		});
	}

	private static async _exportImmoToFile(
		items: WillhabenHunterImmoItem[],
		options: WillhabenHunterExportOptions,
	): Promise<string> {
		const outputPath = options.outputPath!;

		if (options.format === "csv") {
			await WillhabenHunterCsvExporter.exportImmoToFile(items, outputPath);
		} else {
			await WillhabenHunterJsonExporter.exportToFile(items, outputPath);
		}

		return outputPath;
	}

	private static _exportImmoToConsole(
		items: WillhabenHunterImmoItem[],
		options: WillhabenHunterExportOptions,
	): Promise<undefined> {
		const output =
			options.format === "csv"
				? WillhabenHunterCsvExporter.toImmoConsoleString(items)
				: WillhabenHunterJsonExporter.toConsoleString(items);

		return new Promise((resolve, reject) => {
			process.stdout.write(output + "\n", (err) => {
				if (err) reject(err);
				else resolve(undefined);
			});
		});
	}

	private static async _exportJobsToFile(
		items: WillhabenHunterJobsItem[],
		options: WillhabenHunterExportOptions,
	): Promise<string> {
		const outputPath = options.outputPath!;

		if (options.format === "csv") {
			await WillhabenHunterCsvExporter.exportJobsToFile(items, outputPath);
		} else {
			await WillhabenHunterJsonExporter.exportToFile(items, outputPath);
		}

		return outputPath;
	}

	private static _exportJobsToConsole(
		items: WillhabenHunterJobsItem[],
		options: WillhabenHunterExportOptions,
	): Promise<undefined> {
		const output =
			options.format === "csv"
				? WillhabenHunterCsvExporter.toJobsConsoleString(items)
				: WillhabenHunterJsonExporter.toConsoleString(items);

		return new Promise((resolve, reject) => {
			process.stdout.write(output + "\n", (err) => {
				if (err) reject(err);
				else resolve(undefined);
			});
		});
	}
}
