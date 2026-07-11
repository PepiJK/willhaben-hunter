/**
 * Supported output formats.
 */
export type WillhabenHunterOutputFormat = "json" | "csv";

/**
 * Options controlling how and where results are exported.
 */
export interface WillhabenHunterExportOptions {
	format: WillhabenHunterOutputFormat;
	outputPath?: string;
}
