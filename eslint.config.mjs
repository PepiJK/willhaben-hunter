import eslint from "@eslint/js";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	sonarjs.configs.recommended,
	{
		rules: {
			"@typescript-eslint/no-explicit-any": "error",
		},
	},
);
