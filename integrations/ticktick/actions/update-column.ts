import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project that contains the column. Example: "6226ff9877acee87727f6bca"'),
        columnId: z.string().describe('Identifier of the column to rename. Example: "6226ff9e76e5fc39f2862d1b"'),
        name: z
            .string()
            .min(1)
            .max(64)
            .describe('New name to give the column, up to 64 characters (TickTick silently truncates longer names). Example: "In Progress"')
    })
    .describe('Identifies the TickTick column to rename and the new name to apply.');

const ColumnSchema = z.object({
    id: z.string().describe('Column identifier.'),
    projectId: z.string().describe('Identifier of the project the column belongs to.'),
    name: z.string().describe('Name of the column after the update.'),
    sortOrder: z.number().describe('Order value of the column within its project.')
});

const OutputSchema = ColumnSchema.describe('The column as returned by TickTick after the rename.');

/**
 * @tags: [write]
 * @tagReason: Renames an existing column by posting a new name to the provider, mutating the column's name field.
 * @pitfalls: A non-existent projectId or columnId returns HTTP 200 with an empty body instead of a 404, so the action throws a not_found error rather than surfacing a provider error.
 */
const action = createAction({
    description: 'Rename a column.',
    version: '1.0.0',
    scopes: ['tasks:write'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ticktick.com/docs/openapi.md (Update Column)
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/column/${encodeURIComponent(input.columnId)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Column not found for the given projectId and columnId.',
                projectId: input.projectId,
                columnId: input.columnId
            });
        }

        const column = ColumnSchema.parse(response.data);

        return {
            id: column.id,
            projectId: column.projectId,
            name: column.name,
            sortOrder: column.sortOrder
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
