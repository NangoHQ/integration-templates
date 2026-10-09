import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('Identifier of the project to create the column in. Example: "6ac5b589bed7f77658a9a803"'),
        name: z.string().describe('Name of the new column. Maximum 1000 characters. Example: "In Progress"')
    })
    .describe('Input for creating a new column (section) on a TickTick project.');

const ProviderColumnSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    name: z.string(),
    sortOrder: z.number()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created column.'),
        projectId: z.string().describe('Identifier of the project the column belongs to.'),
        name: z.string().describe('Name of the column.'),
        sortOrder: z.number().describe('Zero-based position of the column within the project.')
    })
    .describe('The newly created column (section) on the project.');

/**
 * @tags: [write]
 * @tagReason: Creates a new column (section) on a project, which mutates provider state.
 * @pitfalls: TickTick exposes no delete-column endpoint, so a created column can only be renamed afterwards and cannot be removed through the API.
 */
const action = createAction({
    description: 'Create a new column (section) on a project, for kanban-style organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ticktick.com/docs/openapi.md (Create Column)
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}/column`,
            data: {
                name: input.name
            },
            // Non-idempotent create: a retry after a lost response would create a duplicate column.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries must stay 0 here
            retries: 0
        });

        const column = ProviderColumnSchema.parse(response.data);

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
