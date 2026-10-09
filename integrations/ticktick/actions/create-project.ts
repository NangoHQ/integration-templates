import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the project. Example: "Q4 Planning"'),
        color: z.string().optional().describe('Hex color of the project. Example: "#F18181"'),
        sortOrder: z.number().int().optional().describe('Sort order value of the project. Example: 0'),
        viewMode: z.enum(['list', 'kanban', 'timeline']).optional().describe('View mode of the project: "list", "kanban" or "timeline". Example: "list"'),
        kind: z.enum(['TASK', 'NOTE']).optional().describe('Kind of project: "TASK" or "NOTE". Example: "TASK"')
    })
    .describe('Input for creating a new TickTick project.');

const ProviderProjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullish(),
    sortOrder: z.number().nullish(),
    closed: z.boolean().nullish(),
    groupId: z.string().nullish(),
    viewMode: z.string().nullish(),
    permission: z.string().nullish(),
    kind: z.string().nullish()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created project. Example: "6226ff9877acee87727f6bca"'),
        name: z.string().describe('Name of the created project. Example: "Q4 Planning"'),
        color: z.string().optional().describe('Hex color of the project. Example: "#F18181"'),
        sortOrder: z.number().optional().describe('Sort order value of the project. Example: 0'),
        closed: z.boolean().optional().describe('Whether the project is closed. Example: false'),
        groupId: z.string().optional().describe('Identifier of the project group the project belongs to, if any.'),
        viewMode: z.string().optional().describe('View mode of the project. Example: "list"'),
        permission: z.string().optional().describe('Permission level on the project: "read", "write" or "comment".'),
        kind: z.string().optional().describe('Kind of project: "TASK" or "NOTE". Example: "TASK"')
    })
    .describe('The newly created TickTick project.');

/**
 * @tags: [write]
 * @tagReason: Creates a new project in the provider account.
 * @pitfalls: This is a real create with no deduplication, so calling it twice with the same name produces two separate projects.
 */
const action = createAction({
    description: 'Create a new project (list).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ticktick.com/docs/openapi.md (Create Project)
            endpoint: '/open/v1/project',
            data: {
                name: input.name,
                ...(input.color !== undefined && { color: input.color }),
                ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
                ...(input.viewMode !== undefined && { viewMode: input.viewMode }),
                ...(input.kind !== undefined && { kind: input.kind })
            },
            // Not idempotent: no idempotency key, and a retry after a lost response would create a duplicate project.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const project = ProviderProjectSchema.parse(response.data);

        return {
            id: project.id,
            name: project.name,
            ...(project.color != null && { color: project.color }),
            ...(project.sortOrder != null && { sortOrder: project.sortOrder }),
            ...(project.closed != null && { closed: project.closed }),
            ...(project.groupId != null && { groupId: project.groupId }),
            ...(project.viewMode != null && { viewMode: project.viewMode }),
            ...(project.permission != null && { permission: project.permission }),
            ...(project.kind != null && { kind: project.kind })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
