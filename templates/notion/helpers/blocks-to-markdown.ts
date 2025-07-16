import { NangoSync, NangoAction } from "nango";
import { fetchBlocks } from '../utils.js';
import {
    heading1,
    codeBlock,
    heading2,
    bullet,
    heading3,
    callout,
    quote,
    link,
    divider,
    equation,
    image,
    todo,
    table,
    toggle,
    inlineEquation
} from './object-mapping.js';
import { annotatePlainText } from './annotate-plain-text.js';

// Adaptation of https://github.com/souvikinator/notion-to-md
export const blockToMarkdown = async (nango: NangoSync | NangoAction, block: any) => {
    if (typeof block !== 'object' || !('type' in block)) {
        return '';
    }

    let parsedData = '';
    const { type } = block;

    switch (type) {
        case 'image': {
            const blockContent = block.image;
            let image_title = 'image';

            const image_caption_plain = blockContent.caption.map((item: any) => item.plain_text).join('');

            const image_type = blockContent.type;
            let link = '';

            if (image_type === 'external') {
                link = blockContent.external.url;
            }

            if (image_type === 'file') {
                link = blockContent.file.url;
            }

            if (image_caption_plain.trim().length > 0) {
                image_title = image_caption_plain;
            } else if (image_type === 'file' || image_type === 'external') {
                const matches = link.match(/[^/\\&?]+\.\w{3,4}(?=([?&].*$|$))/);
                image_title = matches ? matches[0] : image_title;
            }

            return image(image_title, link);
        }
        case 'divider': {
            return divider();
        }
        case 'equation': {
            return equation(block.equation.expression);
        }
        case 'video':
        case 'file':
        case 'pdf':
            {
                let blockContent;
                let title: string = type;

                if (type === 'video') blockContent = block.video;
                if (type === 'file') blockContent = block.file;
                if (type === 'pdf') blockContent = block.pdf;

                const caption = blockContent?.caption.map((item: any) => item.plain_text).join('');

                if (blockContent) {
                    const file_type = blockContent.type;
                    let _link = '';
                    if (file_type === 'external') _link = blockContent.external.url;
                    if (file_type === 'file') _link = blockContent.file.url;

                    if (caption && caption.trim().length > 0) {
                        title = caption;
                    } else if (_link) {
                        const matches = _link.match(/[^/\\&?]+\.\w{3,4}(?=([?&].*$|$))/);
                        title = matches ? matches[0] : type;
                    }

                    return link(title, _link);
                }
            }
            break;
        case 'bookmark':
        case 'embed':
        case 'link_preview':
        case 'link_to_page':
            {
                let blockContent;
                const title: string = type;
                if (type === 'bookmark') blockContent = block.bookmark;
                if (type === 'embed') blockContent = block.embed;
                if (type === 'link_preview') blockContent = block.link_preview;
                if (type === 'link_to_page' && block.link_to_page.type === 'page_id') {
                    blockContent = { url: block.link_to_page.page_id };
                }

                if (blockContent) return link(title, blockContent.url);
            }
            break;
        case 'child_page':
            return heading2(block.child_page.title);
        case 'child_database': {
            return block.child_database.title || 'child_database';
        }
        case 'table': {
            const { id, has_children } = block;
            const tableArr: string[][] = [];
            if (has_children) {
                const tableRows = await fetchBlocks(nango, id);
                const rowsPromise = tableRows?.map(async (row: any) => {
                    const { type } = row;
                    const cells = row[type]['cells'];
                    const cellStringPromise = cells.map(
                        async (cell: any) =>
                            await blockToMarkdown(nango, {
                                type: 'paragraph',
                                paragraph: { rich_text: cell }
                            })
                    );

                    const cellStringArr = await Promise.all(cellStringPromise);
                    tableArr.push(cellStringArr);
                });
                await Promise.all(rowsPromise || []);
            }
            return table(tableArr);
        }
        case 'toggle': {
            const { id } = block;
            const childrenBlocks = await fetchBlocks(nango, id);
            const content: string = (await Promise.all(childrenBlocks.map(async (b) => blockToMarkdown(nango, b)))).join('');

            if (!block.toggle?.rich_text) {
                return content;
            }

            const summary = block.toggle.rich_text.map((b: any) => b.plain_text).join('');

            return toggle(summary, content);
        }
        default: {
            const blockContent = block[type].text || block[type].rich_text || [];
            blockContent.map((content: any) => {
                if (content.type === 'equation') {
                    parsedData += inlineEquation(content.equation.expression);
                    return;
                }

                const annotations = content.annotations;
                let plain_text = annotatePlainText(content.plain_text, annotations);
                if (content['href']) {
                    plain_text = link(plain_text, content['href']);
                }
                parsedData += plain_text;
            });
        }
    }

    switch (type) {
        case 'code':
            parsedData = codeBlock(parsedData, block[type].language);
            break;
        case 'heading_1':
            parsedData = heading1(parsedData);
            break;
        case 'heading_2':
            parsedData = heading2(parsedData);
            break;
        case 'heading_3':
            parsedData = heading3(parsedData);
            break;
        case 'quote':
            parsedData = quote(parsedData);
            break;
        case 'callout':
            {
                const { id, has_children } = block;

                if (!has_children) {
                    return callout(parsedData, block[type].icon);
                }

                const childrenBlocks = await fetchBlocks(nango, id);
                const mdBlocks = await blocksToMarkdown(nango, childrenBlocks);
                const content = `${parsedData}\n${mdBlocks.join('\n\n')}`;
                parsedData = callout(content.trim(), block[type].icon);
            }
            break;
        case 'bulleted_list_item':
            {
                const { id, has_children } = block;

                if (!has_children) {
                    return bullet(parsedData);
                }

                const childrenBlocks = await fetchBlocks(nango, id);
                const mdBlocks = await blocksToMarkdown(nango, childrenBlocks);
                const content = `${parsedData}\n${indentParagraph(mdBlocks.join('\n'))}`;
                parsedData = bullet(content.trim());
            }
            break;
        case 'numbered_list_item':
            {
                const { id, has_children } = block;

                if (!has_children) {
                    return bullet(parsedData, block.numbered_list_item.number);
                }

                const childrenBlocks = await fetchBlocks(nango, id);
                const mdBlocks = await blocksToMarkdown(nango, childrenBlocks);
                const content = `${parsedData}\n${indentParagraph(mdBlocks.join('\n'))}`;
                parsedData = bullet(content.trim(), block.numbered_list_item.number);
            }
            break;
        case 'to_do':
            {
                const { id, has_children } = block;

                if (!has_children) {
                    return todo(parsedData, block.to_do.checked);
                }

                const childrenBlocks = await fetchBlocks(nango, id);
                const mdBlocks = await blocksToMarkdown(nango, childrenBlocks);
                const content = `${parsedData}\n${indentParagraph(mdBlocks.join('\n'))}`;
                parsedData = todo(content.trim(), block.to_do.checked);
            }
            break;
    }

    return parsedData;
};

const blocksToMarkdown = async (nango: NangoSync | NangoAction, blocks: any[]) => {
    return Promise.all(blocks.map(async (block) => blockToMarkdown(nango, block)));
};

const indentParagraph = (paragraph: string) => {
    return paragraph
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n');
};
