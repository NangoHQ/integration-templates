import fs from 'fs';

const INSTRUCTIONS_PATH = './WRITING_INTEGRATION_SCRIPTS.md';
const HELPERS_PATH = './README.md';
const OUTPUT_PATH = './.cursor/rules/nango-script-best-practices.mdc';

function extractMarkdownSection(content: string, heading: string): string {
    const sectionRegex = new RegExp(`#* ${heading}([\\s\\S]*?)(?=\\n#|$)`, 'i');
    const match = content.match(sectionRegex);
    if (!match || !match[1]) {
        throw new Error(`Could not find section: ${heading}`);
    }

    return `# ${heading}${match[1].trim()}`;
}

function main() {
    const instructionsMd = fs.readFileSync(INSTRUCTIONS_PATH, 'utf-8');
    const helpersMd = fs.readFileSync(HELPERS_PATH, 'utf-8');

    const sections = [
        extractMarkdownSection(instructionsMd, 'Scripts'),
        extractMarkdownSection(instructionsMd, 'Validation'),
        extractMarkdownSection(instructionsMd, 'Syncs'),
        extractMarkdownSection(instructionsMd, 'Actions'),
        extractMarkdownSection(helpersMd, 'Script Helpers')
    ];

    const frontmatter = `---
ruleType: always
alwaysApply: true
---

`;

    const fullContent = frontmatter + sections.join('\n\n');
    fs.writeFileSync(OUTPUT_PATH, fullContent);
    console.log(`✅ MDC file written to: ${OUTPUT_PATH}`);
}

main();
