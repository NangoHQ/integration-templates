import { z } from 'zod';
import { createAction } from 'nango';

const CellLocationSchema = z.object({
    rowIndex: z.number().int().min(0).describe('Zero-based row index of the reference cell. Example: 0'),
    columnIndex: z.number().int().min(0).describe('Zero-based column index of the reference cell. Example: 0')
});

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that contains the table. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        tableObjectId: z.string().describe('The object ID of the table to insert rows into. Example: "my_table_1"'),
        cellLocation: CellLocationSchema.describe(
            'The reference table cell used as the insertion anchor. A new row is inserted above or below the row that contains this cell.'
        ),
        insertBelow: z.boolean().describe('Whether to insert the new rows below the reference cell (true) or above it (false).'),
        number: z.number().int().min(1).max(20).describe('Number of rows to insert, from 1 to 20 (the API caps a single request at 20 rows). Example: 2')
    })
    .describe('Parameters for inserting one or more rows into an existing table in a Google Slides presentation.');

const TableSchema = z.object({
    rows: z.number(),
    columns: z.number()
});

const PageElementSchema = z.object({
    objectId: z.string(),
    table: TableSchema.optional()
});

const SlideSchema = z.object({
    objectId: z.string(),
    pageElements: z.array(PageElementSchema).optional()
});

const PresentationSchema = z.object({
    slides: z.array(SlideSchema).optional()
});

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that was updated.'),
        pageObjectId: z.string().describe('The object ID of the slide that contains the table.'),
        tableObjectId: z.string().describe('The object ID of the table that was updated.'),
        insertBelow: z.boolean().describe('Whether the rows were inserted below (true) or above (false) the reference cell.'),
        rowsInserted: z.number().describe('The number of rows requested for insertion.'),
        rowCount: z.number().describe('The total number of rows in the table after the insertion.'),
        columnCount: z.number().describe('The total number of columns in the table after the insertion.')
    })
    .describe('The outcome of the insert, including the table location and its row and column counts after the rows were added.');

/**
 * @tags: [write]
 * @tagReason: Inserts new rows into an existing Google Slides table via presentations.batchUpdate, mutating the presentation's content.
 * @pitfalls: number is capped at 20 rows per call, so larger inserts must be split across calls; insertBelow: false inserts the rows above the reference cell; and a cellLocation whose row or column index is outside the table is rejected.
 */
const action = createAction({
    description: 'Insert one or more rows above or below a reference cell in a table.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
        await nango.post({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        insertTableRows: {
                            tableObjectId: input.tableObjectId,
                            cellLocation: {
                                rowIndex: input.cellLocation.rowIndex,
                                columnIndex: input.cellLocation.columnIndex
                            },
                            insertBelow: input.insertBelow,
                            number: input.number
                        }
                    }
                ]
            },
            // Not idempotent: a retry after a lost response would insert the rows a second time.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        // https://developers.google.com/slides/api/reference/rest/v1/presentations/get
        const presentationResponse = await nango.get({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}`,
            params: {
                fields: 'slides(objectId,pageElements(objectId,table(rows,columns)))'
            },
            retries: 3
        });

        const presentation = PresentationSchema.parse(presentationResponse.data);

        let pageObjectId: string | undefined;
        let rowCount: number | undefined;
        let columnCount: number | undefined;

        for (const slide of presentation.slides ?? []) {
            for (const element of slide.pageElements ?? []) {
                if (element.objectId === input.tableObjectId && element.table) {
                    pageObjectId = slide.objectId;
                    rowCount = element.table.rows;
                    columnCount = element.table.columns;
                }
            }
        }

        if (pageObjectId === undefined || rowCount === undefined || columnCount === undefined) {
            throw new nango.ActionError({
                type: 'table_not_found',
                message: 'The table could not be found after the insert request; verify the tableObjectId.',
                presentationId: input.presentationId,
                tableObjectId: input.tableObjectId
            });
        }

        return {
            presentationId: input.presentationId,
            pageObjectId,
            tableObjectId: input.tableObjectId,
            insertBelow: input.insertBelow,
            rowsInserted: input.number,
            rowCount,
            columnCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
