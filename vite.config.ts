/// <reference types="vitest" />

// Configure Vitest (https://vitest.dev/config/)

import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
        exclude: [...configDefaults.exclude, 'nango-integrations/**'],
        setupFiles: 'vitest.setup.ts'
    }
});
