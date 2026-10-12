import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectGroupId: z.string().describe('Identifier of the project group to rename. Example: "6ac94f338f089f376a25814c"'),
        name: z.string().min(1).max(64).describe('New name for the project group, up to 64 characters. Example: "Work Projects"')
    })
    .describe('Input for renaming a TickTick project group.');

const ProviderProjectGroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    sortOrder: z.number().optional(),
    showAll: z.boolean().optional(),
    viewMode: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('Identifier of the updated project group. Example: "6ac94f338f089f376a25814c"'),
        name: z.string().describe('Updated name of the project group. Example: "Work Projects"'),
        sortOrder: z.number().optional().describe('Sort order value of the project group. Example: 0'),
        showAll: z.boolean().optional().describe('Whether the group shows all of its projects. Example: true'),
        viewMode: z.string().optional().describe('Display mode of the group, e.g. "list", "kanban", or "timeline". Example: "list"')
    })
    .describe('The updated TickTick project group.');

/**
 * @tags: [write]
 * @tagReason: Renames an existing project group through a provider mutation.
 * @pitfalls: If projectGroupId does not exist, the provider creates a new project group with that exact id instead of returning 404, so a mistyped id can create an unintended group; names longer than 64 characters are rejected.
 */
const action = createAction({
    description: 'Rename a project group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md (Update Project Group)
        const response = await nango.post({
            endpoint: `/open/v1/project/group/${encodeURIComponent(input.projectGroupId)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        const providerGroup = ProviderProjectGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            name: providerGroup.name,
            ...(providerGroup.sortOrder !== undefined && { sortOrder: providerGroup.sortOrder }),
            ...(providerGroup.showAll !== undefined && { showAll: providerGroup.showAll }),
            ...(providerGroup.viewMode !== undefined && { viewMode: providerGroup.viewMode })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
