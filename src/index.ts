/**
 * Entry point for the Willhaben Hunter CLI application.
 */
import { runCLI } from "./cli";

// Execute the CLI
runCLI(process.argv).catch((error) => {
	console.error("Fatal Error:", error);
	process.exit(1);
});
