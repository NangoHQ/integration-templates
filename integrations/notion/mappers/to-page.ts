import type { NangoAction, RichPage, NangoSync } from '../../models.js';
import type { Page, TitleElement } from '../types.js';
import { richPageSchema } from '../schema.zod.js';
import { blockToMarkdown } from '../helpers/blocks-to-markdown.js';
import { propertyToPlainText } from '../helpers/object-mapping.js';
import { fetchBlocks } from '../utils.js';

export const mapPage = async (nango: NangoSync | NangoAction, page: Page): Promise<RichPage> => {
    const content = await fetchAsMarkdown(nango, page);

    const properties = Object.entries(page.properties).reduce<Partial<Record<string, string>>>((acc, [key, value]) => {
        const textValue = propertyToPlainText(value);
        if (textValue !== undefined) {
            return {
                ...acc,
                [key]: textValue
            };
        }
        return acc;
    }, {});

    let title = properties['title'] ?? '';
    if (!title) {
        // When the page is part of a table, the title is the
        // value of the first column, and can be obtained by
        // finding the column with a 'title' type.
        for (const [_key, property] of Object.entries(page.properties)) {
            if (property.type === 'title' && 'title' in property) {
                title = property.title.map((t: TitleElement) => t.plain_text).join('');
                break;
            }
        }
    }

    const richPage: RichPage = {
        id: page.id,
        path: page.url,
        title,
        content: content,
        contentType: 'md',
        last_modified: page.last_edited_time,
        meta: {
            created_time: page.created_time,
            last_edited_time: page.last_edited_time,
            properties
        }
    };

    const parsedPage = richPageSchema.parse(richPage);

    if ('page_id' in page.parent) {
        parsedPage.parent_id = page.parent.page_id;
    }

    return parsedPage;
};

const fetchAsMarkdown = async (nango: NangoSync | NangoAction, page: Page): Promise<string> => {
    const blocks = await fetchBlocks(nango, page.id);
    const markdownBlocks = await Promise.all(blocks.map(async (block: any) => (await blockToMarkdown(nango, block)).trim()));
    return markdownBlocks.join('\n\n');
};
