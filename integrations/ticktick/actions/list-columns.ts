import { z } from 'zod';
import { createAction } from 'nango';

const ColumnSchema = z.object({
    id: z.string().describe('Unique identifier of the column. Example: "6ac5b589bed7f77658a9a804"'),
    projectId: z.string().describe('Identifier of the project the column belongs to. Example: "6ac5b589bed7f77658a9a803"'),
    name: z.string().describe('Display name of the column. Example: "Getting Started"'),
    sortOrder: z.number().describe('Sort order of the column within the project; lower values appear first.')
});

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project whose columns should be listed. Example: "6ac5b589bed7f77658a9a803"')
    })
    .describe('Input for listing the columns defined on a TickTick project.');

const OutputSchema = z
    .object({
        columns: z.array(ColumnSchema).describe('Columns (kanban sections) defined on the project.')
    })
    .describe('The columns (kanban sections) defined on the requested project.');

/**
 * @tags: [read]
 * @tagReason: Reads the columns configured on a project; performs no provider mutation.
 * @pitfalls: Projects in list view still return their section columns, so a non-empty result does not mean the project is a kanban board.
 */
const action = createAction({
    description: 'List the kanban/section columns defined on a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ticktick.com/docs/openapi.md (Column > Get Columns)
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/column`,
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected TickTick to return an array of columns.'
            });
        }

        const columns = z.array(ColumnSchema).parse(response.data);

        return { columns };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
