import fs from 'fs';
import yaml from 'js-yaml';

const INSTRUCTIONS_MD_PATH = './guides/WRITING_SCRIPTS.md';
const YAML_TEMPLATE_PATH = './coderabbit.template.yaml';
const OUTPUT_PATH = './.coderabbit.yaml';
const MAX_CHARS = 3000;

function summarizeContent(content: string): string {
    // Split content into sections
    const sections = content.split(/\n##\s+/);

    // Extract section titles and their content
    const parsedSections = sections.map((section) => {
        const lines = section.split('\n');
        return {
            title: lines[0]?.trim() || '',
            content: lines.slice(1).join('\n').trim()
        };
    });

    // Core sections we want to keep
    const coreSections = ['General Guidelines', 'Types and Models', 'API Calls and Configuration', 'Syncs', 'Actions'];

    // Start with a brief introduction
    let summary = '# TypeScript Development Guidelines\n\n';

    // Add core guidelines first
    for (const section of parsedSections) {
        if (coreSections.some((core) => section.title.includes(core))) {
            // Extract key points (lines starting with - or •)
            const keyPoints = section.content
                .split('\n')
                .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('•'))
                .map((line) => line.trim())
                .join('\n');

            if (keyPoints) {
                summary += `## ${section.title}\n${keyPoints}\n\n`;
            }
        }
    }

    // If still over limit, remove code examples and less critical points
    if (summary.length > MAX_CHARS) {
        summary = summary
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/\n\n+/g, '\n\n') // Remove extra newlines
            .split('\n')
            .filter((line) => !line.includes('❌')) // Remove negative examples
            .join('\n');
    }

    // If still over limit, keep only the most important points
    if (summary.length > MAX_CHARS) {
        const lines = summary.split('\n');
        let result = lines[0] + '\n\n'; // Keep the title
        let currentLength = result.length;

        for (const line of lines.slice(1)) {
            const lineLength = line.length + 1; // +1 for newline
            if (currentLength + lineLength <= MAX_CHARS) {
                result += line + '\n';
                currentLength += lineLength;
            }
        }
        summary = result;
    }

    return summary.trim();
}

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
    const instructions = content.replace(configSection, '').trim();
    return summarizeContent(instructions);
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

        const current = entry.instructions || '';
        const addition = additions[path]?.trim() || '';
        entry.instructions = [current.trim(), addition].filter(Boolean).join('\n\n');
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
