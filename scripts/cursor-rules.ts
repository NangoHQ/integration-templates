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

    return match[1].trim();
}

function main() {
    const instructionsMd = fs.readFileSync(INSTRUCTIONS_PATH, 'utf-8');
    const helpersMd = fs.readFileSync(HELPERS_PATH, 'utf-8');

    // Create a structured object for YAML
    const yamlStructure = {
        sections: {
            scripts: extractMarkdownSection(instructionsMd, 'Scripts'),
            validation: extractMarkdownSection(instructionsMd, 'Validation'),
            syncs: extractMarkdownSection(instructionsMd, 'Syncs'),
            actions: extractMarkdownSection(instructionsMd, 'Actions'),
            script_helpers: extractMarkdownSection(helpersMd, 'Script Helpers')
        }
    };

    const yamlOutput = yaml.dump(yamlStructure, {
        lineWidth: 1000,
        indent: 2,
        noRefs: true,
        quotingType: '"'
    });

    fs.writeFileSync(OUTPUT_PATH, yamlOutput);
    console.log(`✅ Valid YAML written to: ${OUTPUT_PATH}`);
}

main();
