import { describe, expect, it } from "vitest";
import { WillhabenHunterChunkArray, WillhabenHunterFormatExecutionTime } from "../src/utils/utils";

describe("Utils Suite", () => {
	describe("chunkArray", () => {
		it("should chunk an array correctly", () => {
			const arr = [1, 2, 3, 4, 5];
			const result = WillhabenHunterChunkArray(arr, 2);
			expect(result).toEqual([[1, 2], [3, 4], [5]]);
		});
	});

	describe("formatExecutionTime", () => {
		it("should format time under 60 seconds correctly", () => {
			expect(WillhabenHunterFormatExecutionTime(4.52)).toBe("4.52s");
			expect(WillhabenHunterFormatExecutionTime(59.99)).toBe("59.99s");
		});

		it("should format time over 60 seconds into minutes and seconds", () => {
			expect(WillhabenHunterFormatExecutionTime(60)).toBe("1m 0s");
			expect(WillhabenHunterFormatExecutionTime(110.77)).toBe("1m 51s");
			expect(WillhabenHunterFormatExecutionTime(125)).toBe("2m 5s");
		});
	});
});
