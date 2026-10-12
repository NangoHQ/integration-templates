import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.string().describe('TickTick project identifier. Example: "6226ff9877acee87727f6bca"')
    })
    .describe('Input for retrieving a single TickTick project by its ID.');

const OutputSchema = z
    .object({
        id: z.string().describe('Project identifier.'),
        name: z.string().describe('Project name.'),
        color: z.string().optional().describe('Project color as a hex code. Example: "#F18181".'),
        sortOrder: z.number().optional().describe('Sort order value used to order the project.'),
        closed: z.boolean().optional().describe('Whether the project is closed.'),
        groupId: z.string().optional().describe('Identifier of the project group this project belongs to.'),
        viewMode: z.string().optional().describe('Project view mode: "list", "kanban", or "timeline".'),
        permission: z.string().optional().describe('Current user\'s permission on the project: "read", "write", or "comment".'),
        kind: z.string().optional().describe('Project kind: "TASK" or "NOTE".')
    })
    .describe('A single TickTick project.');

/**
 * @tags: [read]
 * @tagReason: Retrieves an existing project from TickTick without modifying any provider state.
 * @pitfalls: A nonexistent or deleted project ID fails with a 404 error rather than returning an empty result.
 */
const action = createAction({
    description: 'Retrieve a single project by its ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md (Get Project By ID)
        const response = await nango.get({
            endpoint: `/open/v1/project/${encodeURIComponent(input.projectId)}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
