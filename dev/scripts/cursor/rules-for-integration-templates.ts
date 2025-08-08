import fs from 'fs';
import { PERSONA_SECTION } from './shared.js';

// File paths
const GUIDES_DIR = './guides';
const OUTPUT_DIR = './.cursor/rules';

const PATHS = {
    writing: `${GUIDES_DIR}/WRITING_SCRIPTS.md`,
    templates: `${GUIDES_DIR}/WRITING_INTEGRATION_TEMPLATES.md`,
    patterns: `${GUIDES_DIR}/ADVANCED_INTEGRATION_SCRIPT_PATTERNS.md`,
    output: `${OUTPUT_DIR}/nango-script-best-practices.mdc`
} as const;

const FRONTMATTER = `---
ruleType: always
alwaysApply: true
---

`;

function main() {
    const content = [
        FRONTMATTER,
        PERSONA_SECTION,
        fs.readFileSync(PATHS.writing, 'utf-8'),
        fs.readFileSync(PATHS.templates, 'utf-8'),
        fs.readFileSync(PATHS.patterns, 'utf-8')
    ].join('');

    fs.writeFileSync(PATHS.output, content);
    console.log(`✅ MDC file written to: ${PATHS.output}`);
}

main();
