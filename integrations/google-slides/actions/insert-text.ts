import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that contains the shape or table.'),
        objectId: z.string().describe('The object ID of the shape or table whose text should receive the inserted text.'),
        text: z.string().describe('The text to insert. Newline characters create new paragraphs.'),
        insertionIndex: z
            .number()
            .int()
            .min(0)
            .describe('The 0-based character index (in Unicode code units) at which to insert the text. Use 0 to insert at the start of an empty shape.'),
        cellLocation: z
            .object({
                rowIndex: z.number().int().min(0).describe('The 0-based row index of the target cell within the table.'),
                columnIndex: z.number().int().min(0).describe('The 0-based column index of the target cell within the table.')
            })
            .optional()
            .describe('The table cell to insert into. Required when objectId refers to a table; omit when objectId refers to a shape.')
    })
    .describe('Input for inserting text into a shape or table cell of a Google Slides presentation.');

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that was updated.'),
        objectId: z.string().describe('The object ID of the shape or table that received the text.'),
        insertedText: z.string().describe('The text that was inserted.'),
        insertionIndex: z.number().describe('The 0-based index at which the text was inserted.'),
        text: z
            .string()
            .optional()
            .describe(
                'The full text content of the target shape or table cell after the insert. Omitted when the target could not be located on a slide or speaker notes page (for example a layout or master shape).'
            ),
        verified: z.boolean().describe('Whether a follow-up read confirmed the inserted text is present in the target.')
    })
    .describe('Result of the text insert, including the full text of the target after the write and whether the insert was verified.');

const TextRunSchema = z.object({
    content: z.string().optional()
});

const TextElementSchema = z.object({
    textRun: TextRunSchema.optional()
});

const TextSchema = z.object({
    textElements: z.array(TextElementSchema).optional()
});

const TableCellSchema = z.object({
    text: TextSchema.optional()
});

const TableRowSchema = z.object({
    tableCells: z.array(TableCellSchema).optional()
});

const TableSchema = z.object({
    tableRows: z.array(TableRowSchema).optional()
});

const ShapeSchema = z.object({
    text: TextSchema.optional()
});

interface PageElement {
    objectId: string;
    shape?: z.infer<typeof ShapeSchema> | undefined;
    table?: z.infer<typeof TableSchema> | undefined;
    elementGroup?: { children?: PageElement[] | undefined } | undefined;
}

const PageElementSchema: z.ZodType<PageElement> = z.lazy(() =>
    z.object({
        objectId: z.string(),
        shape: ShapeSchema.optional(),
        table: TableSchema.optional(),
        elementGroup: z
            .object({
                children: z.array(PageElementSchema).optional()
            })
            .optional()
    })
);

const SlideSchema = z.object({
    objectId: z.string(),
    pageElements: z.array(PageElementSchema).optional(),
    slideProperties: z
        .object({
            notesPage: z
                .object({
                    pageElements: z.array(PageElementSchema).optional()
                })
                .optional()
        })
        .optional()
});

const PresentationSchema = z.object({
    slides: z.array(SlideSchema).optional()
});

function collectText(text: z.infer<typeof TextSchema> | undefined): string {
    let result = '';
    for (const element of text?.textElements ?? []) {
        if (element.textRun?.content) {
            result += element.textRun.content;
        }
    }
    return result;
}

function findElement(elements: PageElement[] | undefined, objectId: string): PageElement | undefined {
    for (const element of elements ?? []) {
        if (element.objectId === objectId) {
            return element;
        }
        const nested = findElement(element.elementGroup?.children, objectId);
        if (nested) {
            return nested;
        }
    }
    return undefined;
}

function findTargetText(
    presentation: z.infer<typeof PresentationSchema>,
    objectId: string,
    cellLocation: z.infer<typeof InputSchema>['cellLocation']
): string | undefined {
    for (const slide of presentation.slides ?? []) {
        // Shapes can live inside (nested) groups and on the slide's speaker notes page.
        const element = findElement(slide.pageElements, objectId) ?? findElement(slide.slideProperties?.notesPage?.pageElements, objectId);
        if (!element) {
            continue;
        }
        if (element.table) {
            if (!cellLocation) {
                return '';
            }
            const row = element.table.tableRows?.[cellLocation.rowIndex];
            const cell = row?.tableCells?.[cellLocation.columnIndex];
            return collectText(cell?.text);
        }
        return collectText(element.shape?.text);
    }
    return undefined;
}

/**
 * @tags: [read, write]
 * @tagReason: Reads the presentation back to verify the insert and writes new text into a shape or table cell via batchUpdate.
 * @pitfalls: Shapes inside groups and on speaker notes pages are found by the read-back, but shapes on layouts or masters are not, so text is omitted and verified is false for them. verified can also be false even after a successful insert because Google strips unsupported control and private-use characters from the text; insertionIndex is a 0-based code-unit offset over the target's full text including its mandatory trailing newline, so an out-of-range value fails with an error naming the real length; table cells require cellLocation while shapes must omit it, and Google may shift the index to avoid splitting a Unicode grapheme cluster.
 */
const action = createAction({
    description: 'Insert text into a shape or table cell at a given index.',
    version: '1.0.0',
    scopes: ['https://www.googleapis.com/auth/presentations'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const insertTextRequest = {
            objectId: input.objectId,
            text: input.text,
            insertionIndex: input.insertionIndex,
            ...(input.cellLocation
                ? {
                      cellLocation: {
                          rowIndex: input.cellLocation.rowIndex,
                          columnIndex: input.cellLocation.columnIndex
                      }
                  }
                : {})
        };

        await nango.post({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [{ insertText: insertTextRequest }]
            },
            // insertText is not idempotent: a retry after a lost response would insert the text a second time
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const response = await nango.get({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/get
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}`,
            params: {
                // Full pageElements so shapes nested in groups (at any depth) can be found; notes pages hold speaker notes shapes.
                fields: 'slides(objectId,pageElements,slideProperties.notesPage.pageElements)'
            },
            retries: 3
        });

        const parsed = PresentationSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Could not parse the presentation returned by Google Slides.'
            });
        }

        // The write already succeeded at this point, so a target missing from the read-back is reported as unverified rather than as an error.
        const text = findTargetText(parsed.data, input.objectId, input.cellLocation);

        return {
            presentationId: input.presentationId,
            objectId: input.objectId,
            insertedText: input.text,
            insertionIndex: input.insertionIndex,
            ...(text !== undefined && { text }),
            verified: text !== undefined && text.includes(input.text)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
