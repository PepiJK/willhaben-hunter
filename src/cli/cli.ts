import { Command } from "commander";
import { WillhabenHunterMarketplaceCli } from "./marketplace-cli";
import { WillhabenHunterImmoCli } from "./immo-cli";

/**
 * Main application class handling the CLI interface and orchestrating the scraping process.
 */
export class WillhabenHunterCli {
	private _program: Command;
	private _marketplaceCli: WillhabenHunterMarketplaceCli;
	private _immoCli: WillhabenHunterImmoCli;

	constructor() {
		this._program = new Command();
		this._marketplaceCli = new WillhabenHunterMarketplaceCli();
		this._immoCli = new WillhabenHunterImmoCli();
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

		this._marketplaceCli.setupCommand(this._program);
		this._immoCli.setupCommand(this._program);
	}
}
