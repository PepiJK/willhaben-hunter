import { checkbox, input } from "@inquirer/prompts";
import { Command, InvalidArgumentError, Option } from "commander";
import ora from "ora";
import * as path from "path";
import pc from "picocolors";
import { WillhabenHunterExporter } from "../exporter/exporter";
import { ExportOptions, OutputFormat } from "../exporter/exporter.interface";
import { WillhabenHunterScraper } from "../scraper/scraper";
import { Area, districtNumberMap, SortOrder, ViennaDistrict } from "../scraper/scraper.const";
import { ScrapeOptions } from "../scraper/scraper.interface";
import { formatExecutionTime } from "../utils/utils";
import { CliPromptStep, CliSearchOptions } from "./cli.interface";

/**
 * Main application class handling the CLI interface and orchestrating the scraping process.
 */
export class WillhabenHunterCli {
	private _program: Command;
	private _scraper: WillhabenHunterScraper;

	constructor() {
		this._program = new Command();
		this._scraper = new WillhabenHunterScraper();
	}

	/**
	 * Initializes and parses the command-line arguments.
	 *
	 * @param argv - The raw process arguments.
	 */
	public async run(argv: string[]): Promise<void> {
		this._setupCommands();
		await this._program.parseAsync(argv);
	}

	/**
	 * Configures the commander program options and actions.
	 */
	private _setupCommands(): void {
		this._program
			.name("willhaben-hunter")
			.description("A CLI to scrape items from willhaben.at")
			.version("1.0.0");

		this._program
			.command("search")
			.description("Search for items on willhaben")
			.option("-q, --query <string>", 'Search query (e.g., "iphone")')
			.option("--price-min <number>", "Minimum price", parseFloat)
			.option("--price-max <number>", "Maximum price", parseFloat)
			.addOption(
				new Option(
					"-a, --area <areas...>",
					"Area (Bundesland) to search in. Can be specified multiple times.",
				)
					.choices(Object.values(Area))
					.argParser((val, prev: string[]) => {
						const lower = val.toLowerCase();
						return prev ? prev.concat([lower]) : [lower];
					}),
			)
			.addOption(
				new Option(
					"--wien-districts <districts...>",
					"Vienna district numbers (1-23)",
				).argParser((val: string, prev: ViennaDistrict[]) => {
					const num = parseInt(val, 10);
					if (isNaN(num) || num < 1 || num > 23) {
						throw new InvalidArgumentError(
							`District must be a number between 1 and 23, got: ${val}`,
						);
					}
					const district = districtNumberMap[num] as ViennaDistrict;
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
					Object.values(SortOrder),
				),
			)
			.option("--skip-details", "Skip fetching item detail pages (faster)")
			.option("--quiet", "Suppress summary output (data only)")
			.option("--fail-on-empty", "Exit with code 1 when no results are found")
			.option("--non-interactive", "Force non-interactive mode (no prompts)")
			.action(async (options: CliSearchOptions) => {
				await this._executeSearchAction(options);
			});
	}

	/**
	 * Executes the search action, handling prompts and scraping.
	 *
	 * @param options - The parsed command-line options.
	 */
	private async _executeSearchAction(options: CliSearchOptions): Promise<void> {
		let scrapeOptions: ScrapeOptions;

		const isInteractiveEnvironment = process.stdin.isTTY && process.stdout.isTTY;

		if (isInteractiveEnvironment && !options.nonInteractive) {
			scrapeOptions = await this._handleInteractivePrompts(options);
		} else {
			if (!options.query || !options.query.trim()) {
				this._reportError(
					"Search query is required in non-interactive mode. Use -q <query>.",
				);
			}
			scrapeOptions = { query: options.query };
			if (options.limit !== undefined) scrapeOptions.limit = options.limit;
			if (options.priceMin !== undefined) scrapeOptions.priceMin = options.priceMin;
			if (options.priceMax !== undefined) scrapeOptions.priceMax = options.priceMax;
			if (options.area !== undefined) scrapeOptions.area = options.area;
			if (options.wienDistricts !== undefined)
				scrapeOptions.wienDistricts = options.wienDistricts;
		}

		if (options.sort) scrapeOptions.sort = options.sort;
		if (options.skipDetails) scrapeOptions.skipDetails = true;

		const exportOptions: ExportOptions = {
			format: (options.format as OutputFormat) ?? "json",
			outputPath: options.output,
		};

		await this._runScraperAndExport(scrapeOptions, exportOptions, {
			quiet: options.quiet ?? false,
			failOnEmpty: options.failOnEmpty ?? false,
		});
	}

	/**
	 * Handles interactive prompts for missing options.
	 *
	 * @param options - The initial options provided via CLI arguments.
	 * @returns The complete scrape options.
	 */
	private async _handleInteractivePrompts(options: CliSearchOptions): Promise<ScrapeOptions> {
		let { query, priceMin, priceMax, area, limit, wienDistricts } = options;

		const steps: CliPromptStep[] = [];
		if (!query) steps.push(CliPromptStep.QUERY);
		if (priceMin === undefined) steps.push(CliPromptStep.PRICE_MIN);
		if (priceMax === undefined) steps.push(CliPromptStep.PRICE_MAX);
		if (area === undefined) steps.push(CliPromptStep.AREA);
		if (limit === undefined) steps.push(CliPromptStep.LIMIT);

		let currentStepIndex = 0;

		while (currentStepIndex < steps.length && currentStepIndex >= 0) {
			const step = steps[currentStepIndex];
			try {
				switch (step) {
					case CliPromptStep.QUERY: {
						const q = await input({
							message: "Enter the item to search for:",
							default: query || "",
							validate: (val: string) =>
								val.trim().length > 0 || "Search query is required",
						});
						query = q;
						break;
					}
					case CliPromptStep.PRICE_MIN: {
						const pMin = await input({
							message: "Enter minimum price (or press enter to skip):",
							default: priceMin?.toString() || "",
						});
						priceMin = pMin.trim() ? parseFloat(pMin) : undefined;
						break;
					}
					case CliPromptStep.PRICE_MAX: {
						const pMax = await input({
							message: "Enter maximum price (or press enter to skip):",
							default: priceMax?.toString() || "",
						});
						priceMax = pMax.trim() ? parseFloat(pMax) : undefined;
						break;
					}
					case CliPromptStep.AREA: {
						const a = await checkbox({
							message:
								"Select areas to search in (use space to select, enter to confirm):",
							choices: Object.values(Area).map((val) => ({
								name: val,
								value: val,
								checked: area?.includes(val as Area) || false,
							})),
						});
						area = a && a.length > 0 ? (a as Area[]) : undefined;

						// If Wien is selected, we prompt for districts next
						if (area && area.includes(Area.WIEN) && !wienDistricts) {
							if (!steps.includes(CliPromptStep.WIEN_DISTRICTS)) {
								steps.splice(currentStepIndex + 1, 0, CliPromptStep.WIEN_DISTRICTS);
							}
						}
						break;
					}
					case CliPromptStep.WIEN_DISTRICTS: {
						const wd = await checkbox({
							message: "Select Vienna districts (or none for all of Vienna):",
							choices: Object.values(ViennaDistrict).map((val) => ({
								name: val,
								value: val,
								checked: wienDistricts?.includes(val as ViennaDistrict) || false,
							})),
						});
						wienDistricts = wd && wd.length > 0 ? (wd as ViennaDistrict[]) : undefined;
						break;
					}
					case CliPromptStep.LIMIT: {
						const l = await input({
							message: "Enter maximum items to scrape (or press enter to skip):",
							default: limit?.toString() || "",
						});
						limit = l.trim() ? parseInt(l, 10) : undefined;
						break;
					}
				}
				currentStepIndex++;
			} catch (err: unknown) {
				if (err instanceof Error && err.name === "ExitPromptError") {
					console.error(pc.yellow("Aborted by user."));
					process.exit(0);
				} else if (err === "") {
					// Fallback for unexpected empty throw
					console.error(pc.yellow("Aborted by user."));
					process.exit(0);
				} else {
					console.error(pc.red("Prompt error:"), err);
					process.exit(1);
				}
			}
		}

		const result: ScrapeOptions = { query: query! };
		if (limit !== undefined && !isNaN(limit)) result.limit = limit;
		if (priceMin !== undefined && !isNaN(priceMin)) result.priceMin = priceMin;
		if (priceMax !== undefined && !isNaN(priceMax)) result.priceMax = priceMax;
		if (area) result.area = area;
		if (wienDistricts) result.wienDistricts = wienDistricts;

		return result;
	}

	/**
	 * Orchestrates the scraper and the exporter.
	 *
	 * @param scrapeOptions - The options for scraping.
	 * @param exportOptions - The options for output format and destination.
	 * @param cliFlags - Additional CLI behaviour flags.
	 */
	private async _runScraperAndExport(
		scrapeOptions: ScrapeOptions,
		exportOptions: ExportOptions,
		cliFlags: { quiet: boolean; failOnEmpty: boolean },
	): Promise<void> {
		const startTime = performance.now();
		const spinner = ora({
			text: pc.blue(`Searching willhaben for: ${scrapeOptions.query}`),
			stream: process.stderr,
		}).start();

		// Attach progress callback
		scrapeOptions.onProgress = (message: string) => {
			spinner.text = pc.blue(`Searching willhaben for: ${scrapeOptions.query} (${message})`);
		};

		try {
			const results = await this._scraper.scrape(scrapeOptions);
			spinner.succeed(pc.green(`Successfully scraped ${results.length} items!`));

			let exportPath: string | undefined;

			if (results.length > 0) {
				exportPath = await WillhabenHunterExporter.export(results, exportOptions);
			}

			const endTime = performance.now();
			const elapsedSeconds = (endTime - startTime) / 1000;

			if (!cliFlags.quiet) {
				this._printSummary(
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
			spinner.fail(pc.red("Failed to scrape willhaben."));
			if (error instanceof Error) {
				this._reportError(error.message);
			}
		}
	}

	/**
	 * Prints the run summary to stderr.
	 * Uses human-readable emoji format for TTY, structured JSON for non-TTY.
	 */
	private _printSummary(
		scrapeOptions: ScrapeOptions,
		exportOptions: ExportOptions,
		exportPath: string | undefined,
		resultCount: number,
		elapsedSeconds: number,
	): void {
		if (process.stderr.isTTY) {
			const formattedTime = formatExecutionTime(elapsedSeconds);

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
		} else {
			// Structured JSON metadata for non-TTY consumers (LLMs, scripts)
			const metadata = {
				query: scrapeOptions.query,
				resultCount,
				format: exportOptions.format,
				outputPath: exportPath ? path.resolve(exportPath) : null,
				durationSeconds: parseFloat(elapsedSeconds.toFixed(2)),
			};
			console.error(JSON.stringify(metadata));
		}
	}

	/**
	 * Reports an error and exits. Uses colored text for TTY, structured JSON for non-TTY.
	 *
	 * @param message - The error message.
	 */
	private _reportError(message: string): never {
		if (process.stderr.isTTY) {
			console.error(pc.red(`Error: ${message}`));
		} else {
			console.error(JSON.stringify({ error: message }));
		}
		process.exit(1);
	}
}
