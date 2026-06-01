import { nestJsConfig } from '@repo/eslint-config/nest-js';
import { disableUnsafeTypeScriptRules } from '@repo/eslint-config/base';

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nestJsConfig,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  disableUnsafeTypeScriptRules,
];
