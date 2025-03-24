import fs from 'fs';
import yaml from 'js-yaml';

const INSTRUCTIONS_MD_PATH = './WRITING_INTEGRATION_SCRIPTS.md';
const YAML_TEMPLATE_PATH = './coderabbit.template.yaml';
const OUTPUT_PATH = './.coderabbit.yaml';

function extractNangoConfig(content: string): string {
    const sectionRegex = new RegExp(`## Configuration - nango\\.yaml([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = content.match(sectionRegex);
    if (!match || !match[1]) {
        throw new Error('Could not find Configuration - nango.yaml section');
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

function extractScriptInstructions(content: string): string {
    const configSection = new RegExp(`## Configuration - nango\\.yaml[\\s\\S]*?(?=\\n##|$)`, 'i');
    // Remove the config section and get everything else
    return content.replace(configSection, '').trim();
}

function appendInstructions(templateYaml: string, additions: Record<string, string>): string {
    type PathInstruction = {
        path: string;
        instructions?: string;
    };

    type YamlDoc = {
        reviews: {
            path_instructions: PathInstruction[];
        };
    };

    const doc = yaml.load(templateYaml) as YamlDoc;

    if (!Array.isArray(doc?.reviews?.path_instructions)) {
        throw new Error('Invalid or missing reviews.path_instructions in template YAML');
    }

    for (const path in additions) {
        const entry = doc.reviews.path_instructions.find((p) => p.path === path);
        if (!entry) throw new Error(`Path instruction not found for: ${path}`);

        const current = (entry.instructions ?? '').trim();
        const addition = additions[path].trim();
        entry.instructions = [current, addition].filter(Boolean).join('\n\n');
    }

    return yaml.dump(doc, { lineWidth: 1000 });
}

function main() {
    const instructionsMd = fs.readFileSync(INSTRUCTIONS_MD_PATH, 'utf-8');
    const templateYaml = fs.readFileSync(YAML_TEMPLATE_PATH, 'utf-8');

    const nangoYamlInstructions = extractNangoConfig(instructionsMd);
    const scriptInstructions = extractScriptInstructions(instructionsMd);

    const additionsMap: Record<string, string> = {
        'integrations/**/nango.yaml': nangoYamlInstructions,
        'integrations/**/**.ts': scriptInstructions
    };

    const updatedYaml = appendInstructions(templateYaml, additionsMap);
    fs.writeFileSync(OUTPUT_PATH, updatedYaml);
    console.log(`✅ YAML generated: ${OUTPUT_PATH}`);
}

main();
