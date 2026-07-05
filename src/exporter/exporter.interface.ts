/**
 * Supported output formats.
 */
export type OutputFormat = "json" | "csv";

/**
 * Options controlling how and where results are exported.
 */
export interface WillhabenHunterExportOptions {
	format: OutputFormat;
	outputPath?: string | undefined;
}
