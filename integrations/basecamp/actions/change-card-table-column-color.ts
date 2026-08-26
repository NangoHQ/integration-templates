import { z } from 'zod';
import { createAction } from 'nango';

const ColorEnum = z.enum(['white', 'red', 'orange', 'yellow', 'green', 'blue', 'aqua', 'purple', 'gray', 'pink', 'brown']);

const InputSchema = z
    .object({
        projectId: z.string().describe('The ID of the Basecamp project (bucket) that contains the card table column.'),
        columnId: z.string().describe('The ID of the card table column whose color should be changed.'),
        color: ColorEnum.describe('The new color for the column. Allowed values: white, red, orange, yellow, green, blue, aqua, purple, gray, pink, brown.')
    })
    .describe("Input for changing a card table column's color.");

const ProviderColumnSchema = z.object({
    id: z.number(),
    title: z.string(),
    color: z.string().optional(),
    type: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The ID of the card table column.'),
        title: z.string().describe('The title of the card table column.'),
        color: z.string().optional().describe('The color of the card table column.')
    })
    .describe('Output of a card table column after its color has been changed.');

/**
 * @tags: [write]
 * @tagReason: Mutates the card table column by updating its color.
 */
const action = createAction({
    description: "Change a card table column's color.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/card_table_columns.md
            endpoint: `/buckets/${encodeURIComponent(input.projectId)}/card_tables/columns/${encodeURIComponent(input.columnId)}/color.json`,
            data: {
                color: input.color
            },
            retries: 3
        });

        const column = ProviderColumnSchema.parse(response.data);

        return {
            id: column.id,
            title: column.title,
            ...(column.color != null && { color: column.color })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
