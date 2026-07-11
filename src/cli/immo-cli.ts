import { select } from "@inquirer/prompts";
import { Command, InvalidArgumentError, Option } from "commander";
import ora from "ora";
import * as path from "path";
import pc from "picocolors";
import { WillhabenHunterExporter } from "../exporter/exporter";
import {
	WillhabenHunterOutputFormat,
	WillhabenHunterExportOptions,
} from "../exporter/exporter.interface";
import { WillhabenHunterImmoScraper } from "../scraper/immo-scraper";
import {
	WILLHABEN_HUNTER_DISTRICT_NUMBER_MAP,
	WillhabenHunterArea,
	WillhabenHunterImmoType,
	WillhabenHunterViennaDistrict,
} from "../scraper/scraper.const";
import { WillhabenHunterImmoScrapeOptions } from "../scraper/scraper.interface";
import { WillhabenHunterFormatExecutionTime } from "../utils/utils";
import { WillhabenHunterCliImmoOptions } from "./cli.interface";
import {
	willhabenHunterPromptOptionalNumber,
	willhabenHunterPromptOptionalInt,
	willhabenHunterPromptOptionalText,
	willhabenHunterPromptArea,
	willhabenHunterPromptWienDistricts,
	willhabenHunterHandlePromptError,
	willhabenHunterReportError,
} from "./cli-shared";

/** Prompts for the immo property type via a select list. */
export async function willhabenHunterPromptImmoType(
	current?: WillhabenHunterImmoType,
): Promise<WillhabenHunterImmoType> {
	if (current) return current;
	return select<WillhabenHunterImmoType>({
		message: "Select the property listing type:",
		choices: Object.values(WillhabenHunterImmoType).map((val) => ({ name: val, value: val })),
	});
}

export class WillhabenHunterImmoCli {
	private _immoScraper: WillhabenHunterImmoScraper;

	constructor() {
		this._immoScraper = new WillhabenHunterImmoScraper();
	}

	//#region Immo command

	/**
	 * Registers the `immo` command for scraping Immobilien listings.
	 */
	public setupCommand(program: Command): void {
		program
			.command("immo")
			.description("Search for real-estate listings on willhaben Immobilien")
			.addOption(
				new Option("--type <type>", "Property listing type").choices(
					Object.values(WillhabenHunterImmoType),
				),
			)
			.option("-q, --query <string>", "Optional keyword to search within listings")
			.option("--price-min <number>", "Minimum price", parseFloat)
			.option("--price-max <number>", "Maximum price", parseFloat)
			.option("--rooms <number>", "Minimum number of rooms (e.g. 3 means 3+ rooms)", parseInt)
			.option("--size-min <number>", "Minimum living area in m²", parseFloat)
			.option("--size-max <number>", "Maximum living area in m²", parseFloat)
			.addOption(
				new Option(
					"-a, --area <areas...>",
					"Bundesland to search in. Can be specified multiple times.",
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
			.option("-l, --limit <number>", "Maximum number of listings to scrape", parseInt)
			.addOption(
				new Option("-f, --format <type>", "Output format")
					.choices(["json", "csv"])
					.default("json"),
			)
			.option("-o, --output <path>", "Output file path (omit to print to console)")
			.option("--skip-details", "Skip fetching listing detail pages (faster)")
			.option("--quiet", "Suppress summary output (data only)")
			.option("--fail-on-empty", "Exit with code 1 when no results are found")
			.option("--non-interactive", "Force non-interactive mode (no prompts)")
			.action(async (options: WillhabenHunterCliImmoOptions) => {
				await this._executeImmoAction(options);
			});
	}

	/**
	 * Executes the immo action, handling prompts and scraping.
	 *
	 * @param options - The parsed command-line options.
	 */
	private async _executeImmoAction(options: WillhabenHunterCliImmoOptions): Promise<void> {
		const isInteractive =
			process.stdin.isTTY && process.stdout.isTTY && !options.nonInteractive;
		const scrapeOptions = isInteractive
			? await this._handleImmoInteractivePrompts(options)
			: this._buildImmoScrapeOptions(options);

		if (options.skipDetails) scrapeOptions.skipDetails = true;

		await this._runImmoScraperAndExport(
			scrapeOptions,
			{
				format: (options.format as WillhabenHunterOutputFormat) ?? "json",
				outputPath: options.output,
			},
			{ quiet: options.quiet ?? false, failOnEmpty: options.failOnEmpty ?? false },
		);
	}

	/** Builds immo scrape options from non-interactive CLI flags. */
	private _buildImmoScrapeOptions(
		options: WillhabenHunterCliImmoOptions,
	): WillhabenHunterImmoScrapeOptions {
		if (!options.type) {
			willhabenHunterReportError(
				"Property type is required in non-interactive mode. Use --type <type>. " +
					`Valid values: ${Object.values(WillhabenHunterImmoType).join(", ")}`,
			);
		}
		return {
			type: options.type!,
			...(options.query?.trim() && { query: options.query.trim() }),
			...(options.limit !== undefined && { limit: options.limit }),
			...(options.priceMin !== undefined && { priceMin: options.priceMin }),
			...(options.priceMax !== undefined && { priceMax: options.priceMax }),
			...(options.rooms !== undefined && { rooms: options.rooms }),
			...(options.sizeMin !== undefined && { sizeMin: options.sizeMin }),
			...(options.sizeMax !== undefined && { sizeMax: options.sizeMax }),
			...(options.area !== undefined && { area: options.area }),
			...(options.wienDistricts !== undefined && { wienDistricts: options.wienDistricts }),
		};
	}

	/**
	 * Handles interactive prompts for the immo command.
	 *
	 * @param options - The initial options provided via CLI arguments.
	 * @returns The complete immo scrape options.
	 */
	private async _handleImmoInteractivePrompts(
		options: WillhabenHunterCliImmoOptions,
	): Promise<WillhabenHunterImmoScrapeOptions> {
		let {
			type,
			query,
			priceMin,
			priceMax,
			rooms,
			sizeMin,
			sizeMax,
			area,
			limit,
			wienDistricts,
		} = options;

		try {
			type = await willhabenHunterPromptImmoType(type);
			query = await willhabenHunterPromptOptionalText(
				"Enter a keyword to search within listings (or press enter to skip):",
				query,
			);
			priceMin = await willhabenHunterPromptOptionalNumber(
				"Enter minimum price (or press enter to skip):",
				priceMin,
			);
			priceMax = await willhabenHunterPromptOptionalNumber(
				"Enter maximum price (or press enter to skip):",
				priceMax,
			);
			rooms = await willhabenHunterPromptOptionalInt(
				"Enter minimum number of rooms (or press enter to skip):",
				rooms,
			);
			sizeMin = await willhabenHunterPromptOptionalNumber(
				"Enter minimum living area in m² (or press enter to skip):",
				sizeMin,
			);
			sizeMax = await willhabenHunterPromptOptionalNumber(
				"Enter maximum living area in m² (or press enter to skip):",
				sizeMax,
			);
			area = await willhabenHunterPromptArea(area);

			if (area?.includes(WillhabenHunterArea.WIEN)) {
				wienDistricts = await willhabenHunterPromptWienDistricts(wienDistricts);
			}

			limit = await willhabenHunterPromptOptionalInt(
				"Enter maximum listings to scrape (or press enter to skip):",
				limit,
			);
		} catch (err: unknown) {
			willhabenHunterHandlePromptError(err);
		}

		return {
			type: type!,
			...(query?.trim() && { query: query.trim() }),
			...(limit !== undefined && !isNaN(limit) && { limit }),
			...(priceMin !== undefined && !isNaN(priceMin) && { priceMin }),
			...(priceMax !== undefined && !isNaN(priceMax) && { priceMax }),
			...(rooms !== undefined && !isNaN(rooms) && { rooms }),
			...(sizeMin !== undefined && !isNaN(sizeMin) && { sizeMin }),
			...(sizeMax !== undefined && !isNaN(sizeMax) && { sizeMax }),
			...(area && { area }),
			...(wienDistricts && { wienDistricts }),
		};
	}

	/**
	 * Orchestrates the immo scraper and the exporter.
	 *
	 * @param scrapeOptions - The options for immo scraping.
	 * @param exportOptions - The options for output format and destination.
	 * @param cliFlags - Additional CLI behaviour flags.
	 */
	private async _runImmoScraperAndExport(
		scrapeOptions: WillhabenHunterImmoScrapeOptions,
		exportOptions: WillhabenHunterExportOptions,
		cliFlags: { quiet: boolean; failOnEmpty: boolean },
	): Promise<void> {
		const startTime = performance.now();
		const label = scrapeOptions.query
			? `${scrapeOptions.type} · "${scrapeOptions.query}"`
			: scrapeOptions.type;
		const spinner = ora({
			text: pc.blue(`Searching immo for: ${label}`),
			stream: process.stderr,
		}).start();

		scrapeOptions.onProgress = (message: string) => {
			spinner.text = pc.blue(`Searching immo for: ${label} (${message})`);
		};

		try {
			const results = await this._immoScraper.scrape(scrapeOptions);
			spinner.succeed(pc.green(`Successfully scraped ${results.length} immo listings!`));

			let exportPath: string | undefined;

			if (results.length > 0) {
				exportPath = await WillhabenHunterExporter.exportImmo(results, exportOptions);
			}

			const endTime = performance.now();
			const elapsedSeconds = (endTime - startTime) / 1000;

			if (process.stderr.isTTY) {
				this._printImmoSummaryTty(
					scrapeOptions,
					exportOptions,
					exportPath,
					results.length,
					elapsedSeconds,
				);
			} else {
				this._printImmoSummaryJson(
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
			spinner.fail(pc.red("Failed to scrape immo listings."));
			if (error instanceof Error) {
				willhabenHunterReportError(error.message);
			}
		}
	}

	/**
	 * Prints the immo run summary to stderr in human-readable emoji format.
	 */
	private _printImmoSummaryTty(
		scrapeOptions: WillhabenHunterImmoScrapeOptions,
		exportOptions: WillhabenHunterExportOptions,
		exportPath: string | undefined,
		resultCount: number,
		elapsedSeconds: number,
	): void {
		const formattedTime = WillhabenHunterFormatExecutionTime(elapsedSeconds);

		console.error("");
		console.error(`  🏠 ${pc.bold("Type:")}         ${scrapeOptions.type}`);
		if (scrapeOptions.query) {
			console.error(`  🔍 ${pc.bold("Keyword:")}      ${scrapeOptions.query}`);
		}
		if (scrapeOptions.rooms !== undefined) {
			console.error(`  🚪 ${pc.bold("Min rooms:")}    ${scrapeOptions.rooms}+`);
		}
		if (scrapeOptions.sizeMin !== undefined || scrapeOptions.sizeMax !== undefined) {
			const sizeStr = [
				scrapeOptions.sizeMin !== undefined ? `${scrapeOptions.sizeMin}m²` : "",
				scrapeOptions.sizeMax !== undefined ? `${scrapeOptions.sizeMax}m²` : "",
			]
				.filter(Boolean)
				.join(" – ");
			console.error(`  📐 ${pc.bold("Size:")}         ${sizeStr}`);
		}
		console.error(`  📦 ${pc.bold("Found:")}        ${resultCount} listings`);
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
	 * Prints the immo run summary to stderr in structured JSON format.
	 */
	private _printImmoSummaryJson(
		scrapeOptions: WillhabenHunterImmoScrapeOptions,
		exportOptions: WillhabenHunterExportOptions,
		exportPath: string | undefined,
		resultCount: number,
		elapsedSeconds: number,
	): void {
		const metadata = {
			type: scrapeOptions.type,
			query: scrapeOptions.query ?? null,
			rooms: scrapeOptions.rooms ?? null,
			sizeMin: scrapeOptions.sizeMin ?? null,
			sizeMax: scrapeOptions.sizeMax ?? null,
			resultCount,
			format: exportOptions.format,
			outputPath: exportPath ? path.resolve(exportPath) : null,
			durationSeconds: parseFloat(elapsedSeconds.toFixed(2)),
		};
		console.error(JSON.stringify(metadata));
	}

	//#endregion
}
