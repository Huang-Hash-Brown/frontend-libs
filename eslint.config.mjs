import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import { fixupConfigRules } from '@eslint/compat';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.jsx'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  ...fixupConfigRules(pluginReactConfig),
  {
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
  {
    ignores: [
      '**/node_modules/',
      '**/coverage/',
      '*.js',
      'dist',
      'packages/ui/*.d.ts',
      'packages/utils/*.d.ts',
      'packages/hooks/*.d.ts',
      'scripts/**/*',
    ],
  },
];
