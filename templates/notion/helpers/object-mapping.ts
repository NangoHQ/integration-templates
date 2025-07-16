import type { CalloutIcon } from '../types.js';
import { markdownTable } from './markdown-table.js';

export const inlineCode = (text: string) => {
    return `\`${text}\``;
};

export const inlineEquation = (text: string) => {
    return `$${text}$`;
};

export const bold = (text: string) => {
    return `**${text}**`;
};

export const italic = (text: string) => {
    return `_${text}_`;
};

export const strikethrough = (text: string) => {
    return `~~${text}~~`;
};

export const underline = (text: string) => {
    return `<u>${text}</u>`;
};

export const link = (text: string, href: string) => {
    return `[${text}](${href})`;
};

export const codeBlock = (text: string, language?: string) => {
    if (language === 'plain text') language = 'text';

    return `\`\`\`${language}
${text}
\`\`\``;
};

export const equation = (text: string) => {
    return `$$
${text}
$$`;
};

export const heading1 = (text: string) => {
    return `# ${text}`;
};

export const heading2 = (text: string) => {
    return `## ${text}`;
};

export const heading3 = (text: string) => {
    return `### ${text}`;
};

export const quote = (text: string) => {
    return `> ${text.replace(/\n/g, '  \n> ')}`;
};

export const callout = (text: string, icon?: CalloutIcon) => {
    let emoji: string | undefined;
    if (icon?.type === 'emoji') {
        emoji = icon.emoji;
    }

    return `> ${emoji ? emoji + ' ' : ''}${text.replace(/\n/g, '  \n> ')}`;
};

export const bullet = (text: string, count?: number) => {
    const renderText = text.trim();
    return count ? `${count}. ${renderText}` : `- ${renderText}`;
};

export const todo = (text: string, checked: boolean) => {
    return checked ? `- [x] ${text}` : `- [ ] ${text}`;
};

export const image = (alt: string, href: string): string => {
    if (href.startsWith('data:')) {
        const base64 = href.split(',').pop();
        return `![${alt}](data:image/png;base64,${base64})`;
    }

    return `![${alt}](${href})`;
};

export const divider = () => {
    return '---';
};

export const toggle = (summary?: string, children?: string) => {
    if (!summary) {
        return children || '';
    }

    return `<details>
<summary>${summary}</summary>
${children || ''}
</details>\n\n`;
};

export const table = (cells: string[][]) => {
    return markdownTable(cells);
};

export const propertyToPlainText = (property: any) => {
    // @allowTryCatch
    try {
        switch (property.type) {
            case 'title': {
                return property.title.map((t: any) => t.plain_text).join('');
            }
            case 'rich_text': {
                return property.rich_text.map((t: any) => t.plain_text).join('');
            }
            case 'number': {
                return String(property.number);
            }
            case 'select': {
                return property.select.name;
            }
            case 'multi_select': {
                return property.multi_select.map((s: any) => s.name).join(', ');
            }
            case 'checkbox': {
                return String(property.checkbox);
            }
            case 'date': {
                return property.date.start;
            }
            case 'created_time': {
                return property.created_time;
            }
            case 'email': {
                return property.email;
            }
            case 'phone_number': {
                return property.phone_number;
            }
            case 'status': {
                return property.status.name;
            }
            case 'formula': {
                return property.formula.string;
            }
        }
    } catch {
        return undefined;
    }
};
