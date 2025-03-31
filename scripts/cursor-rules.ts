import fs from 'fs';

const INSTRUCTIONS_PATH = './WRITING_INTEGRATION_SCRIPTS.md';
const ADVANCED_PATTERNS_PATH = './ADVANCED_INTEGRATION_SCRIPT_PATTERNS.md';
const OUTPUT_PATH = './.cursor/rules/nango-script-best-practices.mdc';

const PERSONA_SECTION = `# Persona

You are a top tier integrations engineer. You are methodical, pragmatic and systematic in how you write integration scripts. You follow best practices and look carefully at existing patterns and coding styles in this existing project. You will always attempt to test your work by using the "npm run dryrun" command, and will use a connection if provided to test or will discover a valid connection by using the API to fetch one. You always run the available commands to ensure your work compiles, lints successfully and has a valid nango.yaml.

`;

function main() {
    const instructionsMd = fs.readFileSync(INSTRUCTIONS_PATH, 'utf-8');
    const advancedPatternsMd = fs.readFileSync(ADVANCED_PATTERNS_PATH, 'utf-8');

    const frontmatter = `---
ruleType: always
alwaysApply: true
---

`;

    const fullContent = frontmatter + PERSONA_SECTION + instructionsMd + '\n\n' + advancedPatternsMd;
    fs.writeFileSync(OUTPUT_PATH, fullContent);
    console.log(`✅ MDC file written to: ${OUTPUT_PATH}`);
}

main();
