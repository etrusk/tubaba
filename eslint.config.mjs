import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/', 'node_modules/', 'coverage/']
  },
  {
    rules: {
      // Allow 'any' type in specific contexts (mocks, time providers, generic utilities)
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow unused vars prefixed with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        }
      ]
    }
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      // More permissive rules for test files
      '@typescript-eslint/no-unused-vars': 'off',
      'no-useless-escape': 'off'
    }
  }
);
