import { Command, InvalidArgumentError, Option } from "commander";
import ora from "ora";
import * as path from "path";
import pc from "picocolors";
import { WillhabenHunterExporter } from "../exporter/exporter";
import {
	WillhabenHunterOutputFormat,
	WillhabenHunterExportOptions,
} from "../exporter/exporter.interface";
import { WillhabenHunterMarketplaceScraper } from "../scraper/marketplace-scraper";
import {
	WILLHABEN_HUNTER_DISTRICT_NUMBER_MAP,
	WillhabenHunterArea,
	WillhabenHunterSortOrder,
	WillhabenHunterViennaDistrict,
} from "../scraper/scraper.const";
import { WillhabenHunterMarketplaceScrapeOptions } from "../scraper/scraper.interface";
import { WillhabenHunterFormatExecutionTime } from "../utils/utils";
import { WillhabenHunterCliMarketplaceOptions } from "./cli.interface";
import {
	willhabenHunterPromptRequiredQuery,
	willhabenHunterPromptOptionalNumber,
	willhabenHunterPromptOptionalInt,
	willhabenHunterPromptArea,
	willhabenHunterPromptWienDistricts,
	willhabenHunterHandlePromptError,
	willhabenHunterReportError,
} from "./cli-shared";

export class WillhabenHunterMarketplaceCli {
	private _marketplaceScraper: WillhabenHunterMarketplaceScraper;

	constructor() {
		this._marketplaceScraper = new WillhabenHunterMarketplaceScraper();
	}

	//#region Marketplace command

	/**
	 * Registers the `marketplace` command for scraping Kaufen & Verkaufen listings.
	 */
	public setupCommand(program: Command): void {
		program
			.command("marketplace")
			.description("Search for items on the willhaben marketplace (Kaufen & Verkaufen)")
			.option("-q, --query <string>", 'Search query (e.g., "iphone")')
			.option("--price-min <number>", "Minimum price", parseFloat)
			.option("--price-max <number>", "Maximum price", parseFloat)
			.addOption(
				new Option(
					"-a, --area <areas...>",
					"WillhabenHunterArea (Bundesland) to search in. Can be specified multiple times.",
				)
					.choices(Object.values(WillhabenHunterArea))
					.argParser((val, prev: string[]) => {
						const lower = val.toLowerCase();
						return prev ? prev.concat([lower]) : [lower];
					}),
			)
			.addOption(
				new Option(
					"--wien-districts <districts...>",
					"Vienna district numbers (1-23)",
				).argParser((val: string, prev: WillhabenHunterViennaDistrict[]) => {
					const num = parseInt(val, 10);
					if (isNaN(num) || num < 1 || num > 23) {
						throw new InvalidArgumentError(
							`District must be a number between 1 and 23, got: ${val}`,
						);
					}
					const district = WILLHABEN_HUNTER_DISTRICT_NUMBER_MAP[
						num
					] as WillhabenHunterViennaDistrict;
					return prev ? prev.concat([district]) : [district];
				}),
			)
			.option("-l, --limit <number>", "Maximum number of items to scrape", parseInt)
			.addOption(
				new Option("-f, --format <type>", "Output format")
					.choices(["json", "csv"])
					.default("json"),
			)
			.option("-o, --output <path>", "Output file path (omit to print to console)")
			.addOption(
				new Option("-s, --sort <order>", "Sort order for results").choices(
					Object.values(WillhabenHunterSortOrder),
				),
			)
			.option("--skip-details", "Skip fetching item detail pages (faster)")
			.option("--quiet", "Suppress summary output (data only)")
			.option("--fail-on-empty", "Exit with code 1 when no results are found")
			.option("--non-interactive", "Force non-interactive mode (no prompts)")
			.action(async (options: WillhabenHunterCliMarketplaceOptions) => {
				await this._executeMarketplaceAction(options);
			});
	}

	/**
	 * Executes the marketplace action, handling prompts and scraping.
	 *
	 * @param options - The parsed command-line options.
	 */
	private async _executeMarketplaceAction(
		options: WillhabenHunterCliMarketplaceOptions,
	): Promise<void> {
		const isInteractive =
			process.stdin.isTTY && process.stdout.isTTY && !options.nonInteractive;
		const scrapeOptions = isInteractive
			? await this._handleMarketplaceInteractivePrompts(options)
			: this._buildMarketplaceScrapeOptions(options);

		if (options.sort) scrapeOptions.sort = options.sort;
		if (options.skipDetails) scrapeOptions.skipDetails = true;

		await this._runMarketplaceScraperAndExport(
			scrapeOptions,
			{
				format: (options.format as WillhabenHunterOutputFormat) ?? "json",
				outputPath: options.output,
			},
			{ quiet: options.quiet ?? false, failOnEmpty: options.failOnEmpty ?? false },
		);
	}

	/** Builds marketplace scrape options from non-interactive CLI flags. */
	private _buildMarketplaceScrapeOptions(
		options: WillhabenHunterCliMarketplaceOptions,
	): WillhabenHunterMarketplaceScrapeOptions {
		if (!options.query || !options.query.trim()) {
			willhabenHunterReportError(
				"Search query is required in non-interactive mode. Use -q <query>.",
			);
		}
		return {
			query: options.query!,
			...(options.limit !== undefined && { limit: options.limit }),
			...(options.priceMin !== undefined && { priceMin: options.priceMin }),
			...(options.priceMax !== undefined && { priceMax: options.priceMax }),
			...(options.area !== undefined && { area: options.area }),
			...(options.wienDistricts !== undefined && { wienDistricts: options.wienDistricts }),
		};
	}

	/**
	 * Handles interactive prompts for the marketplace command.
	 *
	 * @param options - The initial options provided via CLI arguments.
	 * @returns The complete marketplace scrape options.
	 */
	private async _handleMarketplaceInteractivePrompts(
		options: WillhabenHunterCliMarketplaceOptions,
	): Promise<WillhabenHunterMarketplaceScrapeOptions> {
		let { query, priceMin, priceMax, area, limit, wienDistricts } = options;

		try {
			query = await willhabenHunterPromptRequiredQuery(query);
			priceMin = await willhabenHunterPromptOptionalNumber(
				"Enter minimum price (or press enter to skip):",
				priceMin,
			);
			priceMax = await willhabenHunterPromptOptionalNumber(
				"Enter maximum price (or press enter to skip):",
				priceMax,
			);
			area = await willhabenHunterPromptArea(area);

			if (area?.includes(WillhabenHunterArea.WIEN)) {
				wienDistricts = await willhabenHunterPromptWienDistricts(wienDistricts);
			}

			limit = await willhabenHunterPromptOptionalInt(
				"Enter maximum items to scrape (or press enter to skip):",
				limit,
			);
		} catch (err: unknown) {
			willhabenHunterHandlePromptError(err);
		}

		const result: WillhabenHunterMarketplaceScrapeOptions = { query: query! };
		if (limit !== undefined && !isNaN(limit)) result.limit = limit;
		if (priceMin !== undefined && !isNaN(priceMin)) result.priceMin = priceMin;
		if (priceMax !== undefined && !isNaN(priceMax)) result.priceMax = priceMax;
		if (area) result.area = area;
		if (wienDistricts) result.wienDistricts = wienDistricts;

		return result;
	}

	/**
	 * Orchestrates the marketplace scraper and the exporter.
	 *
	 * @param scrapeOptions - The options for marketplace scraping.
	 * @param exportOptions - The options for output format and destination.
	 * @param cliFlags - Additional CLI behaviour flags.
	 */
	private async _runMarketplaceScraperAndExport(
		scrapeOptions: WillhabenHunterMarketplaceScrapeOptions,
		exportOptions: WillhabenHunterExportOptions,
		cliFlags: { quiet: boolean; failOnEmpty: boolean },
	): Promise<void> {
		const startTime = performance.now();
		const spinner = ora({
			text: pc.blue(`Searching marketplace for: ${scrapeOptions.query}`),
			stream: process.stderr,
		}).start();

		scrapeOptions.onProgress = (message: string) => {
			spinner.text = pc.blue(
				`Searching marketplace for: ${scrapeOptions.query} (${message})`,
			);
		};

		try {
			const results = await this._marketplaceScraper.scrape(scrapeOptions);
			spinner.succeed(pc.green(`Successfully scraped ${results.length} marketplace items!`));

			let exportPath: string | undefined;

			if (results.length > 0) {
				exportPath = await WillhabenHunterExporter.export(results, exportOptions);
			}

			const endTime = performance.now();
			const elapsedSeconds = (endTime - startTime) / 1000;

			if (process.stderr.isTTY) {
				this._printMarketplaceSummaryTty(
					scrapeOptions,
					exportOptions,
					exportPath,
					results.length,
					elapsedSeconds,
				);
			} else {
				this._printMarketplaceSummaryJson(
					scrapeOptions,
					exportOptions,
					exportPath,
					results.length,
					elapsedSeconds,
				);
			}

			if (cliFlags.failOnEmpty && results.length === 0) {
				process.exitCode = 1;
			}
		} catch (error) {
			spinner.fail(pc.red("Failed to scrape marketplace."));
			if (error instanceof Error) {
				willhabenHunterReportError(error.message);
			}
		}
	}

	/**
	 * Prints the marketplace run summary to stderr in human-readable emoji format.
	 */
	private _printMarketplaceSummaryTty(
		scrapeOptions: WillhabenHunterMarketplaceScrapeOptions,
		exportOptions: WillhabenHunterExportOptions,
		exportPath: string | undefined,
		resultCount: number,
		elapsedSeconds: number,
	): void {
		const formattedTime = WillhabenHunterFormatExecutionTime(elapsedSeconds);

		console.error("");
		console.error(`  🎯 ${pc.bold("Search:")}       ${scrapeOptions.query}`);
		console.error(`  📦 ${pc.bold("Found:")}        ${resultCount} items`);
		console.error(`  📄 ${pc.bold("Format:")}       ${exportOptions.format.toUpperCase()}`);

		if (exportPath) {
			const resolvedPath = path.resolve(exportPath);
			console.error(
				`  💾 ${pc.bold("File:")}         ${pc.bold(pc.underline(resolvedPath))}`,
			);
		} else if (resultCount > 0) {
			console.error(`  💾 ${pc.bold("Output:")}       ${pc.cyan("Console (stdout)")}`);
		} else {
			console.error(`  💾 ${pc.bold("Output:")}       ${pc.yellow("None (0 results)")}`);
		}

		console.error(`  ⏱️ ${pc.bold("Duration:")}     ${formattedTime}`);
		console.error("");
	}

	/**
	 * Prints the marketplace run summary to stderr in structured JSON format.
	 */
	private _printMarketplaceSummaryJson(
		scrapeOptions: WillhabenHunterMarketplaceScrapeOptions,
		exportOptions: WillhabenHunterExportOptions,
		exportPath: string | undefined,
		resultCount: number,
		elapsedSeconds: number,
	): void {
		const metadata = {
			query: scrapeOptions.query,
			resultCount,
			format: exportOptions.format,
			outputPath: exportPath ? path.resolve(exportPath) : null,
			durationSeconds: parseFloat(elapsedSeconds.toFixed(2)),
		};
		console.error(JSON.stringify(metadata));
	}

	//#endregion
}
