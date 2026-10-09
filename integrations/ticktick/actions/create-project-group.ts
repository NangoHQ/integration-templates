import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        name: z.string().min(1).max(64).describe('Name of the project group (folder) to create. Maximum 64 characters. Example: "Work"')
    })
    .describe('Input for creating a new project group (folder).');

const ProviderProjectGroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    sortOrder: z.number().optional(),
    showAll: z.boolean().optional(),
    viewMode: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the created project group. Example: "6436176a47fd2e05f26ef56e"'),
        name: z.string().describe('Name of the created project group. Example: "Work"'),
        sortOrder: z.number().optional().describe('Sort order value of the project group.'),
        showAll: z.boolean().optional().describe('Whether the group shows all projects assigned to it.'),
        viewMode: z.string().optional().describe('View mode of the group, one of "list", "kanban", or "timeline".')
    })
    .describe('The newly created project group.');

/**
 * @tags: [write]
 * @tagReason: Creates a new project group via the provider API.
 * @pitfalls: Group names are not unique and creation is not idempotent: invoking the action twice with the same name creates a second distinct group instead of reusing the first.
 */
const action = createAction({
    description: 'Create a new project group (folder).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.ticktick.com/docs/openapi.md#create-project-group
            endpoint: '/open/v1/project/group',
            data: {
                name: input.name
            },
            // Create is not idempotent and has no idempotency key, so a retry after a lost response would create a duplicate group.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const group = ProviderProjectGroupSchema.parse(response.data);

        return {
            id: group.id,
            name: group.name,
            ...(group.sortOrder != null && { sortOrder: group.sortOrder }),
            ...(group.showAll != null && { showAll: group.showAll }),
            ...(group.viewMode != null && { viewMode: group.viewMode })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
