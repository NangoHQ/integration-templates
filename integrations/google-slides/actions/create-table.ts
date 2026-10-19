import { z } from 'zod';
import { createAction } from 'nango';

const DimensionSchema = z.object({
    magnitude: z.number().describe('The magnitude of the dimension. Example: 914400'),
    unit: z.enum(['EMU', 'PT']).describe('The unit for magnitude: "EMU" (English Metric Units) or "PT" (points). Example: "EMU"')
});

const AffineTransformSchema = z.object({
    scaleX: z.number().optional().describe('Horizontal scale factor. Tables require a scale of 1. Example: 1'),
    scaleY: z.number().optional().describe('Vertical scale factor. Tables require a scale of 1. Example: 1'),
    shearX: z.number().optional().describe('Horizontal shear factor. Tables require no shear. Example: 0'),
    shearY: z.number().optional().describe('Vertical shear factor. Tables require no shear. Example: 0'),
    translateX: z.number().optional().describe('Horizontal translation in the units set by "unit". Example: 500000'),
    translateY: z.number().optional().describe('Vertical translation in the units set by "unit". Example: 500000'),
    unit: z.enum(['EMU', 'PT']).describe('The unit for the translation values: "EMU" or "PT". Required by the API. Example: "EMU"')
});

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation to add the table to. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        pageObjectId: z.string().describe('The object ID of the slide that will contain the new table. Example: "slide_test_1"'),
        rows: z.number().int().positive().describe('Number of rows in the table. Example: 2'),
        columns: z.number().int().positive().describe('Number of columns in the table. Example: 3'),
        objectId: z
            .string()
            .optional()
            .describe(
                'Optional custom object ID for the new table. Must be 5-50 characters and unique across the whole presentation; auto-generated when omitted. Example: "my_table_1"'
            ),
        size: z
            .object({
                width: DimensionSchema.describe('Width of the table.'),
                height: DimensionSchema.describe('Height of the table.')
            })
            .optional()
            .describe('Optional size of the table. When omitted the table is sized automatically.'),
        transform: AffineTransformSchema.optional().describe(
            'Optional transform for the table. Tables require a scale of 1 and no shear; when omitted the table is centered on the page.'
        )
    })
    .describe('Input for inserting a new table with a given row and column count onto a slide.');

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation the table was added to.'),
        pageObjectId: z.string().describe('The object ID of the slide that contains the new table.'),
        objectId: z.string().describe('The object ID of the created table.'),
        rows: z.number().describe('The actual number of rows in the created table.'),
        columns: z.number().describe('The actual number of columns in the created table.')
    })
    .describe('The newly created table and its verified location on the slide.');

const BatchUpdateResponseSchema = z.object({
    presentationId: z.string().optional(),
    replies: z
        .array(
            z.object({
                createTable: z
                    .object({
                        objectId: z.string()
                    })
                    .optional()
            })
        )
        .optional()
});

const PageSchema = z.object({
    objectId: z.string().optional(),
    pageElements: z
        .array(
            z.object({
                objectId: z.string().optional(),
                table: z
                    .object({
                        rows: z.number().optional(),
                        columns: z.number().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

/**
 * @tags: [write]
 * @tagReason: Creates a new table element on a slide, mutating the presentation.
 * @pitfalls: A custom objectId must be 5-50 characters and unique across the entire presentation, not just the target slide; the provider may adjust the table's actual size/transform from the requested values (tables require a scale of 1 and no shear) and auto-sizes and centers the table when size/transform are omitted.
 */
const action = createAction({
    description: 'Insert a new table with a given row and column count onto a slide.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createResponse = await nango.post({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests: [
                    {
                        createTable: {
                            ...(input.objectId !== undefined && { objectId: input.objectId }),
                            elementProperties: {
                                pageObjectId: input.pageObjectId,
                                ...(input.size !== undefined && { size: input.size }),
                                ...(input.transform !== undefined && { transform: input.transform })
                            },
                            rows: input.rows,
                            columns: input.columns
                        }
                    }
                ]
            },
            // A retry after a lost response would create a second table, so this non-idempotent write is not retried.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsedCreate = BatchUpdateResponseSchema.parse(createResponse.data);
        const createdObjectId = parsedCreate.replies?.[0]?.createTable?.objectId;

        if (!createdObjectId) {
            throw new nango.ActionError({
                type: 'create_failed',
                message: 'The table was not created.',
                presentationId: input.presentationId
            });
        }

        // https://developers.google.com/slides/api/reference/rest/v1/presentations.pages/get
        const pageResponse = await nango.get({
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}/pages/${encodeURIComponent(input.pageObjectId)}`,
            retries: 3
        });

        const page = PageSchema.parse(pageResponse.data);
        const tableElement = (page.pageElements ?? []).find((element) => element.objectId === createdObjectId);
        const table = tableElement?.table;

        if (!table || table.rows === undefined || table.columns === undefined) {
            throw new nango.ActionError({
                type: 'verification_failed',
                message: 'The created table could not be found on the slide.',
                presentationId: input.presentationId,
                pageObjectId: input.pageObjectId,
                objectId: createdObjectId
            });
        }

        return {
            presentationId: input.presentationId,
            pageObjectId: input.pageObjectId,
            objectId: createdObjectId,
            rows: table.rows,
            columns: table.columns
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
