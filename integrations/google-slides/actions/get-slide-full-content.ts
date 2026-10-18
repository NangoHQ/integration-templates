import { z } from 'zod';
import { createAction } from 'nango';

const TextRunSchema = z.object({
    content: z.string().optional()
});

const TextElementSchema = z.object({
    textRun: TextRunSchema.optional()
});

const TextContentSchema = z.object({
    textElements: z.array(TextElementSchema).optional()
});

const ShapeSchema = z.object({
    shapeType: z.string().optional(),
    text: TextContentSchema.optional()
});

const TableCellSchema = z.object({
    text: TextContentSchema.optional()
});

const TableRowSchema = z.object({
    tableCells: z.array(TableCellSchema).optional()
});

const TableSchema = z.object({
    tableRows: z.array(TableRowSchema).optional()
});

const WordArtSchema = z.object({
    renderedText: z.string().optional()
});

const PageElementSchema = z.object({
    objectId: z.string(),
    shape: ShapeSchema.optional(),
    image: z.unknown().optional(),
    table: TableSchema.optional(),
    line: z.unknown().optional(),
    elementGroup: z.unknown().optional(),
    video: z.unknown().optional(),
    wordArt: WordArtSchema.optional(),
    sheetsChart: z.unknown().optional(),
    speakerSpotlight: z.unknown().optional()
});

const SlidePropertiesSchema = z.object({
    layoutObjectId: z.string().optional(),
    masterObjectId: z.string().optional(),
    isSkipped: z.boolean().optional()
});

const PageSchema = z.object({
    objectId: z.string(),
    pageType: z.string().optional(),
    revisionId: z.string().optional(),
    pageElements: z.array(PageElementSchema).optional(),
    slideProperties: SlidePropertiesSchema.optional()
});

const ElementSummarySchema = z.object({
    objectId: z.string().describe('Object ID of the page element, unique across the whole presentation.'),
    kind: z
        .string()
        .describe(
            'Element kind inferred from the populated sub-object: "shape", "image", "table", "line", "group", "video", "wordArt", "sheetsChart", "speakerSpotlight", or "unknown".'
        ),
    shapeType: z.string().optional().describe('Shape type when the element is a shape, for example "TEXT_BOX", "RECTANGLE", "TITLE", or "BODY".'),
    text: z
        .string()
        .optional()
        .describe(
            'Flattened text of the element: shape text runs joined together, table cells joined per row, or word art text. Present as an empty string when a shape or table has a text container but no text. Omitted for elements that cannot hold text, such as images and lines.'
        )
});

const SlideSummarySchema = z.object({
    objectId: z.string().describe('Object ID of the requested slide.'),
    pageType: z.string().optional().describe('Page type of the page, for example "SLIDE"; omitted when the provider does not return it.'),
    revisionId: z.string().optional().describe('Opaque revision ID of the presentation at read time; only populated when the requester has edit access.'),
    slideProperties: z
        .object({
            layoutObjectId: z.string().optional().describe('Object ID of the layout this slide is based on.'),
            masterObjectId: z.string().optional().describe('Object ID of the master this slide is based on.'),
            isSkipped: z.boolean().optional().describe('Whether the slide is skipped during presentation playback.')
        })
        .optional()
        .describe('Slide-specific properties; only present for pages of type SLIDE.')
});

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that contains the slide. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI".'),
        pageId: z.string().describe('The object ID of the slide (page) to read. Example: "slide_test_1".')
    })
    .describe('Identifies the presentation and the slide (page) whose content should be summarized.');

const OutputSchema = z
    .object({
        slide: SlideSummarySchema.describe('The requested slide with its page-level metadata.'),
        elements: z.array(ElementSummarySchema).describe('Readable summary of every page element on the slide. Empty when the slide has no page elements.')
    })
    .describe('The requested slide merged with a readable summary of each of its page elements.');

function getElementKind(element: z.infer<typeof PageElementSchema>): string {
    if (element.shape != null) {
        return 'shape';
    }
    if (element.image != null) {
        return 'image';
    }
    if (element.table != null) {
        return 'table';
    }
    if (element.line != null) {
        return 'line';
    }
    if (element.elementGroup != null) {
        return 'group';
    }
    if (element.video != null) {
        return 'video';
    }
    if (element.wordArt != null) {
        return 'wordArt';
    }
    if (element.sheetsChart != null) {
        return 'sheetsChart';
    }
    if (element.speakerSpotlight != null) {
        return 'speakerSpotlight';
    }
    return 'unknown';
}

function flattenTextContent(text: z.infer<typeof TextContentSchema>): string {
    const textElements = text.textElements ?? [];
    return textElements.map((textElement) => textElement.textRun?.content ?? '').join('');
}

function flattenTableText(table: z.infer<typeof TableSchema>): string {
    const rows = table.tableRows ?? [];
    return rows
        .map((row) => {
            const cells = row.tableCells ?? [];
            return cells.map((cell) => (cell.text != null ? flattenTextContent(cell.text).replace(/\n$/, '') : '')).join('\t');
        })
        .join('\n');
}

function extractElementText(element: z.infer<typeof PageElementSchema>): string | undefined {
    if (element.shape != null) {
        return element.shape.text != null ? flattenTextContent(element.shape.text) : '';
    }
    if (element.table != null) {
        return flattenTableText(element.table);
    }
    if (element.wordArt != null && element.wordArt.renderedText != null) {
        return element.wordArt.renderedText;
    }
    return undefined;
}

/**
 * @tags: [read]
 * @tagReason: Reads an existing slide and its page elements; makes no changes to the presentation.
 * @pitfalls: Grouped shapes and tables are not expanded, so text inside a group is not included and the group appears as a single element with kind "group" and no text; flattened shape and table text keeps the provider's mandatory trailing newline, so the last character is usually "\n".
 */
const action = createAction({
    description: "COMPOSITE: get one slide merged with every page element's type and extracted text, as one readable summary instead of a raw nested dump.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get<unknown>({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations.pages/get
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}/pages/${encodeURIComponent(input.pageId)}`,
            retries: 3
        });

        const page = PageSchema.parse(response.data);

        const elements = (page.pageElements ?? []).map((element) => {
            const shapeType = element.shape?.shapeType;
            const text = extractElementText(element);

            return {
                objectId: element.objectId,
                kind: getElementKind(element),
                ...(shapeType != null && { shapeType }),
                ...(text !== undefined && { text })
            };
        });

        return {
            slide: {
                objectId: page.objectId,
                ...(page.pageType != null && { pageType: page.pageType }),
                ...(page.revisionId != null && { revisionId: page.revisionId }),
                ...(page.slideProperties != null && {
                    slideProperties: {
                        ...(page.slideProperties.layoutObjectId != null && { layoutObjectId: page.slideProperties.layoutObjectId }),
                        ...(page.slideProperties.masterObjectId != null && { masterObjectId: page.slideProperties.masterObjectId }),
                        ...(page.slideProperties.isSkipped != null && { isSkipped: page.slideProperties.isSkipped })
                    }
                })
            },
            elements
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
