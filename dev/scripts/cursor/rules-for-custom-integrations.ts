import fs from 'fs';
import { PERSONA_SECTION } from './shared.js';

// File paths
const GUIDES_DIR = './guides';
const OUTPUT_DIR = './guides/rules-for-custom-nango-integrations';

const PATHS = {
    writing: `${GUIDES_DIR}/WRITING_SCRIPTS.md`,
    custom: `${GUIDES_DIR}/WRITING_CUSTOM_INTEGRATION_SCRIPTS.md`,
    patterns: `${GUIDES_DIR}/ADVANCED_INTEGRATION_SCRIPT_PATTERNS.md`,
    output: `${OUTPUT_DIR}/nango-best-practices.mdc`
} as const;

const FRONTMATTER = `---
description: nango-integrations best practice rules for integration files
glob: nango-integrations/*
ruleType: always
alwaysApply: true
---

`;

function main() {
    const content = [
        FRONTMATTER,
        PERSONA_SECTION,
        fs.readFileSync(PATHS.writing, 'utf-8'),
        fs.readFileSync(PATHS.custom, 'utf-8'),
        fs.readFileSync(PATHS.patterns, 'utf-8')
    ].join('');

    fs.writeFileSync(PATHS.output, content);
    console.log(`✅ MDC file written to: ${PATHS.output}`);
}

main();
