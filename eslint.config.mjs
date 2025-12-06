import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tseslint from "typescript-eslint";

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  stylistic.configs.customize({
    arrowParens: true,
    braceStyle: "1tbs",
    commaDangle: "never",
    quotes: "double",
    semi: true
  }),
  {
    languageOptions: {
      parserOptions: {
        project: "tsconfig.json"
      }
    },
    rules: {
      "@stylistic/jsx-wrap-multilines": "off",
      "@stylistic/max-statements-per-line": "off",
      "@stylistic/operator-linebreak": ["error", "after"],
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-unused-vars": ["error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true
        }
      ],
      "sort-imports": ["error", {
        ignoreCase: false,
        ignoreDeclarationSort: false,
        ignoreMemberSort: false,
        memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
        allowSeparatedGroups: false
      }]
    }
  },
  {
    files: ["*.config.mjs", "*.config.js", "**/*.js"],
    extends: [tseslint.configs.disableTypeChecked]
  }
);
