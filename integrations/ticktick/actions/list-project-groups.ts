import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('This action takes no input parameters.');

const ProjectGroupSchema = z.object({
    id: z.string().describe('Unique identifier for the project group. Example: "6ac95a478f084dbfaa6be000"'),
    name: z.string().describe('Display name of the project group. Example: "Work"'),
    sortOrder: z.number().optional().describe('Sort order of the group relative to other groups. Example: 0'),
    showAll: z.boolean().optional().describe('Whether all projects in the group are shown. Example: true'),
    viewMode: z.string().optional().describe('View mode for the group: "list", "kanban", or "timeline". Not returned by this endpoint in practice.')
});

const OutputSchema = z
    .object({
        groups: z.array(ProjectGroupSchema).describe('The project groups (folders) belonging to the user.')
    })
    .describe("List of the user's project groups.");

/**
 * @tags: [read]
 * @tagReason: Only reads the user's existing project groups from the provider.
 * @pitfalls: The documented `viewMode` field is not returned by this endpoint in practice, so it is usually absent; each group carries only metadata and does not include its member projects.
 */
const action = createAction({
    description: "List the user's project groups (folders that group multiple projects together).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.ticktick.com/docs/openapi.md (Get Project Groups)
        const response = await nango.get({
            endpoint: '/open/v1/project/group',
            retries: 3
        });

        const groups = z.array(ProjectGroupSchema).parse(response.data);

        return {
            groups: groups.map((group) => ({
                id: group.id,
                name: group.name,
                ...(group.sortOrder !== undefined && { sortOrder: group.sortOrder }),
                ...(group.showAll !== undefined && { showAll: group.showAll }),
                ...(group.viewMode !== undefined && { viewMode: group.viewMode })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
