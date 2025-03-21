import fs from 'fs';
import yaml from 'js-yaml';

const INSTRUCTIONS_MD_PATH = './WRITING_INTEGRATION_SCRIPTS.md';
const HELPERS_MD_PATH = './README.md';
const YAML_TEMPLATE_PATH = './coderabbit.template.yaml';
const OUTPUT_PATH = './.coderabbit.yaml';

function extractSection(content: string, heading: string): string {
    const sectionRegex = new RegExp(`#* ${heading}([\\s\\S]*?)(?=\\n#|$)`, 'i');
    const match = content.match(sectionRegex);
    if (!match || !match[1]) {
        throw new Error(`Could not find section: ${heading}`);
    }

    const lines = match[1].trim().split('\n');
    return lines
        .map((line) => {
            if (line.trim().startsWith('-') || line.trim().startsWith('```')) {
                return `- ${line.trim().replace(/^- /, '')}`;
            }
            if (line.trim() === '') return '';
            return `  ${line.trim()}`;
        })
        .join('\n');
}

function appendInstructions(templateYaml: string, additions: Record<string, string>): string {
    const doc = yaml.load(templateYaml) as any;

    if (!Array.isArray(doc?.reviews?.path_instructions)) {
        throw new Error('Invalid or missing reviews.path_instructions in template YAML');
    }

    for (const path in additions) {
        const entry = doc.reviews.path_instructions.find((p: any) => p.path === path);
        if (!entry) throw new Error(`Path instruction not found for: ${path}`);

        const current = entry.instructions?.trim() ?? '';
        const addition = additions[path].trim();
        entry.instructions = [current, addition].filter(Boolean).join('\n\n');
    }

    return yaml.dump(doc, { lineWidth: 1000 });
}

function main() {
    const instructionsMd = fs.readFileSync(INSTRUCTIONS_MD_PATH, 'utf-8');
    const helpersMd = fs.readFileSync(HELPERS_MD_PATH, 'utf-8');
    const templateYaml = fs.readFileSync(YAML_TEMPLATE_PATH, 'utf-8');

    const nangoYamlInstructions = extractSection(instructionsMd, 'Configuration - nango.yaml');
    const scriptInstructions = extractSection(instructionsMd, 'Scripts');
    const scriptHelpers = extractSection(helpersMd, 'Script Helpers');

    const additionsMap: Record<string, string> = {
        'integrations/**/nango.yaml': nangoYamlInstructions,
        'integrations/**/**.ts': `${scriptInstructions}\n\n# Script Helpers\n${scriptHelpers}`
    };

    const updatedYaml = appendInstructions(templateYaml, additionsMap);
    fs.writeFileSync(OUTPUT_PATH, updatedYaml);
    console.log(`✅ YAML generated: ${OUTPUT_PATH}`);
}

main();
