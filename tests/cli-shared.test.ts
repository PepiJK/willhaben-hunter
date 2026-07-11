/* eslint-disable @typescript-eslint/no-explicit-any */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	willhabenHunterHandlePromptError,
	willhabenHunterPromptRequiredQuery,
	willhabenHunterReportError,
} from "../src/cli/cli-shared";
import * as inquirerPrompts from "@inquirer/prompts";

vi.mock("@inquirer/prompts", () => ({
	input: vi.fn(),
}));

describe("cli-shared", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("willhabenHunterPromptRequiredQuery", () => {
		it("should return the current value if provided", async () => {
			const result = await willhabenHunterPromptRequiredQuery("current_val");
			expect(result).toBe("current_val");
		});

		it("should validate the input", async () => {
			const inputMock = inquirerPrompts.input as any;
			inputMock.mockImplementationOnce(async (options: any) => {
				const res = options.validate("   ");
				expect(res).toBe("Search query is required");
				const res2 = options.validate(" valid ");
				expect(res2).toBe(true);
				return "valid";
			});

			const result = await willhabenHunterPromptRequiredQuery();
			expect(result).toBe("valid");
		});
	});

	describe("willhabenHunterHandlePromptError", () => {
		it("should handle ExitPromptError gracefully", () => {
			const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
			const mockConsole = vi.spyOn(console, "error").mockImplementation(() => {});

			const err = new Error("Exit");
			err.name = "ExitPromptError";

			willhabenHunterHandlePromptError(err);

			expect(mockConsole).toHaveBeenCalledWith(expect.stringContaining("Aborted by user"));
			expect(mockExit).toHaveBeenCalledWith(0);
		});

		it("should handle empty string error gracefully", () => {
			const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
			const mockConsole = vi.spyOn(console, "error").mockImplementation(() => {});

			willhabenHunterHandlePromptError("");

			expect(mockConsole).toHaveBeenCalledWith(expect.stringContaining("Aborted by user"));
			expect(mockExit).toHaveBeenCalledWith(0);
		});

		it("should handle other errors as prompt error", () => {
			const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
			const mockConsole = vi.spyOn(console, "error").mockImplementation(() => {});

			const err = new Error("Some error");

			willhabenHunterHandlePromptError(err);

			expect(mockConsole).toHaveBeenCalledWith(expect.stringContaining("Prompt error:"), err);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("willhabenHunterReportError", () => {
		it("should print formatted error for TTY", () => {
			const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
			const mockConsole = vi.spyOn(console, "error").mockImplementation(() => {});

			const originalTTY = process.stderr.isTTY;
			process.stderr.isTTY = true;

			willhabenHunterReportError("A fatal error");

			expect(mockConsole).toHaveBeenCalledWith(expect.stringContaining("A fatal error"));
			expect(mockExit).toHaveBeenCalledWith(1);

			process.stderr.isTTY = originalTTY;
		});

		it("should print JSON error for non-TTY", () => {
			const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
			const mockConsole = vi.spyOn(console, "error").mockImplementation(() => {});

			const originalTTY = process.stderr.isTTY;
			process.stderr.isTTY = false;

			willhabenHunterReportError("A fatal error");

			expect(mockConsole).toHaveBeenCalledWith(JSON.stringify({ error: "A fatal error" }));
			expect(mockExit).toHaveBeenCalledWith(1);

			process.stderr.isTTY = originalTTY;
		});
	});
});
