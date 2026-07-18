import { Command, Option, InvalidArgumentError } from "commander";
import ora from "ora";
import * as path from "path";
import pc from "picocolors";
import { WillhabenHunterExporter } from "../exporter/exporter";
import { WillhabenHunterOutputFormat } from "../exporter/exporter.interface";
import { WillhabenHunterJobsScraper } from "../scraper/jobs-scraper";
import {
	WillhabenHunterJobsScrapeOptions,
	WillhabenHunterJobsItem,
} from "../scraper/scraper.interface";
import { WillhabenHunterFormatExecutionTime } from "../utils/utils";
import {
	WillhabenHunterArea,
	WillhabenHunterJobsEmploymentType,
	WillhabenHunterJobsPosition,
	WillhabenHunterViennaDistrict,
	WILLHABEN_HUNTER_DISTRICT_NUMBER_MAP,
} from "../scraper/scraper.const";
import { WillhabenHunterCliJobsOptions } from "./cli.interface";
import {
	willhabenHunterPromptRequiredQuery,
	willhabenHunterPromptArea,
	willhabenHunterPromptWienDistricts,
	willhabenHunterPromptOptionalInt,
	willhabenHunterHandlePromptError,
	willhabenHunterReportError,
} from "./cli-shared";

export class WillhabenHunterJobsCli {
	private _jobsScraper: WillhabenHunterJobsScraper;

	constructor() {
		this._jobsScraper = new WillhabenHunterJobsScraper();
	}

	//#region Jobs command

	/**
	 * Registers the `jobs` command for scraping jobs listings.
	 */
	public setupCommand(program: Command): void {
		program
			.command("jobs")
			.description("Search for jobs on willhaben Jobs")
			.option("-q, --query <string>", 'Search query (e.g., "software developer")')
			.addOption(
				new Option(
					"--employment-type <types...>",
					"Employment type (e.g., vollzeit, teilzeit)",
				)
					.choices(Object.values(WillhabenHunterJobsEmploymentType))
					.argParser((val, prev: string[]) => {
						return prev ? prev.concat([val]) : [val];
					}),
			)
			.addOption(
				new Option(
					"--position <positions...>",
					"Position (e.g., mitarbeiter:in, leitung/management)",
				)
					.choices(Object.values(WillhabenHunterJobsPosition))
					.argParser((val, prev: string[]) => {
						return prev ? prev.concat([val]) : [val];
					}),
			)
			.addOption(
				new Option(
					"-a, --area <areas...>",
					"Filter by area/state (e.g., wien, niederösterreich). Supports multiple.",
				)
					.choices(Object.values(WillhabenHunterArea))
					.argParser((val, prev: string[]) => {
						return prev ? prev.concat([val]) : [val];
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
			.addOption(
				new Option(
					"--company-type <types...>",
					"Company type ('personalberatung' or 'direkter_arbeitgeber')",
				).argParser((val, prev: string[]) => {
					return prev ? prev.concat([val]) : [val];
				}),
			)
			.addOption(
				new Option(
					"--time-limit <limit>",
					"Time limit ('alle', 'letzte_24_stunden', 'letzte_72_stunden', 'letzte_woche')",
				),
			)
			.option("-l, --limit <number>", "Maximum number of items to scrape", parseInt)
			.addOption(
				new Option("-f, --format <type>", "Output format")
					.choices(["json", "csv"])
					.default("json"),
			)
			.option("-o, --output <path>", "Output file path (omit to print to console)")
			.option("--skip-details", "Skip fetching item detail pages (faster)")
			.option("--quiet", "Suppress summary output (data only)")
			.option("--fail-on-empty", "Exit with code 1 when no results are found")
			.option("--non-interactive", "Force non-interactive mode (no prompts)")
			.action(async (options: WillhabenHunterCliJobsOptions) => {
				await this._executeJobsAction(options);
			});
	}

	/**
	 * Executes the jobs action, handling prompts and scraping.
	 *
	 * @param cliOptions - The options parsed from the command line.
	 */
	// eslint-disable-next-line sonarjs/cognitive-complexity
	private async _executeJobsAction(cliOptions: WillhabenHunterCliJobsOptions): Promise<void> {
		const isInteractive = !cliOptions.nonInteractive;

		try {
			if (isInteractive) {
				cliOptions = await this._promptMissingOptions(cliOptions);
			} else {
				this._validateNonInteractiveOptions(cliOptions);
			}

			const scrapeOptions = this._buildScrapeOptions(cliOptions);
			const startTime = performance.now();
			const items = await this._runScraper(scrapeOptions, !!cliOptions.quiet);
			const endTime = performance.now();
			const elapsedSeconds = (endTime - startTime) / 1000;

			if (cliOptions.failOnEmpty && items.length === 0) {
				process.exitCode = 1;
				return;
			}

			let exportPath: string | undefined;
			if (items.length > 0) {
				exportPath = await WillhabenHunterExporter.exportJobs(items, {
					format: (cliOptions.format as WillhabenHunterOutputFormat) ?? "json",
					outputPath: cliOptions.output ? path.resolve(cliOptions.output) : undefined,
				});
			}

			if (!cliOptions.quiet) {
				if (process.stderr.isTTY) {
					this._printJobsSummaryTty(
						scrapeOptions,
						cliOptions,
						exportPath,
						items.length,
						elapsedSeconds,
					);
				} else {
					this._printJobsSummaryJson(
						scrapeOptions,
						cliOptions,
						exportPath,
						items.length,
						elapsedSeconds,
					);
				}
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes("User force closed")) {
				willhabenHunterHandlePromptError(error);
			} else {
				willhabenHunterReportError(error instanceof Error ? error.message : String(error));
			}
		}
	}

	/**
	 * Prompts the user for required options if they were not provided via CLI arguments.
	 *
	 * @param options - The current options from the CLI.
	 * @returns The updated options with user input.
	 */
	private async _promptMissingOptions(
		options: WillhabenHunterCliJobsOptions,
	): Promise<WillhabenHunterCliJobsOptions> {
		const query = await willhabenHunterPromptRequiredQuery(
			options.query,
			"Enter job to search for:",
		);
		const area = await willhabenHunterPromptArea(options.area);

		let wienDistricts = options.wienDistricts;
		if (area?.includes(WillhabenHunterArea.WIEN)) {
			wienDistricts = await willhabenHunterPromptWienDistricts(wienDistricts);
		}

		const limit = await willhabenHunterPromptOptionalInt(
			"Enter maximum number of listings to scrape (or press enter to skip):",
			options.limit,
		);

		return { ...options, query, limit, area, wienDistricts };
	}

	/**
	 * Validates that all required options are present when running in non-interactive mode.
	 *
	 * @param options - The parsed command-line options.
	 * @throws Error if required options are missing.
	 */
	private _validateNonInteractiveOptions(options: WillhabenHunterCliJobsOptions): void {
		if (!options.query) {
			throw new Error("The --query option is required in non-interactive mode.");
		}
	}

	private _buildScrapeOptions(
		cliOptions: WillhabenHunterCliJobsOptions,
	): WillhabenHunterJobsScrapeOptions {
		return {
			query: cliOptions.query,
			limit: cliOptions.limit,
			employmentType: cliOptions.employmentType,
			position: cliOptions.position,
			area: cliOptions.area,
			wienDistricts: cliOptions.wienDistricts,
			companyType: cliOptions.companyType,
			timeLimit: cliOptions.timeLimit,
			skipDetails: cliOptions.skipDetails,
		};
	}

	private async _runScraper(
		scrapeOptions: WillhabenHunterJobsScrapeOptions,
		quiet: boolean,
	): Promise<WillhabenHunterJobsItem[]> {
		const spinner = ora({
			text: pc.blue(`Searching jobs for: ${scrapeOptions.query}`),
			stream: process.stderr,
		}).start();

		if (quiet) {
			spinner.stop();
		} else {
			scrapeOptions.onProgress = (msg) => {
				spinner.text = pc.blue(`Searching jobs for: ${scrapeOptions.query} (${msg})`);
			};
		}

		try {
			const items = await this._jobsScraper.scrape(scrapeOptions);
			spinner.succeed(pc.green(`Successfully scraped ${items.length} job listings!`));
			return items;
		} catch (error) {
			spinner.fail(pc.red("Scraping failed."));
			throw error;
		}
	}

	private _printJobsSummaryTty(
		scrapeOptions: WillhabenHunterJobsScrapeOptions,
		cliOptions: WillhabenHunterCliJobsOptions,
		exportPath: string | undefined,
		resultCount: number,
		elapsedSeconds: number,
	): void {
		const formattedTime = WillhabenHunterFormatExecutionTime(elapsedSeconds);

		console.error("");
		console.error(`  🎯 ${pc.bold("Search:")}       ${scrapeOptions.query}`);
		console.error(`  📦 ${pc.bold("Found:")}        ${resultCount} jobs`);
		console.error(
			`  📄 ${pc.bold("Format:")}       ${(cliOptions.format || "json").toUpperCase()}`,
		);

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

	private _printJobsSummaryJson(
		scrapeOptions: WillhabenHunterJobsScrapeOptions,
		cliOptions: WillhabenHunterCliJobsOptions,
		exportPath: string | undefined,
		resultCount: number,
		elapsedSeconds: number,
	): void {
		const metadata = {
			query: scrapeOptions.query,
			resultCount,
			format: cliOptions.format || "json",
			outputPath: exportPath ? path.resolve(exportPath) : null,
			durationSeconds: parseFloat(elapsedSeconds.toFixed(2)),
		};
		console.error(JSON.stringify(metadata));
	}

	//#endregion
}
