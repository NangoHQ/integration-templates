import fs from 'fs';
import yaml from 'js-yaml';

const INSTRUCTIONS_PATH = './WRITING_INTEGRATION_SCRIPTS.md';
const HELPERS_PATH = './README.md';
const OUTPUT_PATH = './.cursor/rules/nango-script-best-practices.yaml';

function extractMarkdownSection(content: string, heading: string): string {
    const sectionRegex = new RegExp(`#* ${heading}([\\s\\S]*?)(?=\\n#|$)`, 'i');
    const match = content.match(sectionRegex);
    if (!match || !match[1]) {
        throw new Error(`Could not find section: ${heading}`);
    }

    return `# ${heading}\n${match[1].trim()}`;
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

    const fullMarkdown = sections.join('\n\n');

    const yamlOutput = yaml.dump(fullMarkdown, {
        lineWidth: 1000,
        styles: { '!!str': 'literal' } // forces block literal (|-) style
    });

    fs.writeFileSync(OUTPUT_PATH, yamlOutput);
    console.log(`✅ Valid YAML (markdown string) written to: ${OUTPUT_PATH}`);
}

main();
