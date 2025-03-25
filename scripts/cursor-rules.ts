import fs from 'fs';

const INSTRUCTIONS_PATH = './WRITING_INTEGRATION_SCRIPTS.md';
const OUTPUT_PATH = './.cursor/rules/nango-script-best-practices.mdc';

function main() {
    const instructionsMd = fs.readFileSync(INSTRUCTIONS_PATH, 'utf-8');

    const frontmatter = `---
ruleType: always
alwaysApply: true
---

`;

    const fullContent = frontmatter + instructionsMd;
    fs.writeFileSync(OUTPUT_PATH, fullContent);
    console.log(`✅ MDC file written to: ${OUTPUT_PATH}`);
}

main();
