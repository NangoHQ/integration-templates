import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.string().describe('ClickUp team (workspace) ID. Example: "90152560096"'),
    archived: z.boolean().optional().describe('Include archived spaces. Default: false')
});

const ProviderSpaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    admin_can_manage: z.boolean().nullable().optional(),
    archived: z.boolean().optional(),
    members: z.array(z.unknown()).optional(),
    features: z.unknown().optional(),
    private: z.boolean().optional(),
    statuses: z.array(z.unknown()).optional(),
    multiple_assignees: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    spaces: z.array(ProviderSpaceSchema)
});

const SpaceOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    avatar: z.string().optional(),
    archived: z.boolean().optional(),
    private: z.boolean().optional()
});

const OutputSchema = z.object({
    spaces: z.array(SpaceOutputSchema)
});

const action = createAction({
    description: 'List spaces from ClickUp',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-spaces',
        group: 'Spaces'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const teamId = input.team_id;

        // https://developer.clickup.com/reference/getspaces
        const response = await nango.get({
            endpoint: `/api/v2/team/${encodeURIComponent(teamId)}/space`,
            params: {
                archived: String(input.archived ?? false)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            spaces: providerResponse.spaces.map((space) => ({
                id: space.id,
                name: space.name,
                ...(space.color != null && { color: space.color }),
                ...(space.avatar != null && { avatar: space.avatar }),
                ...(space.archived != null && { archived: space.archived }),
                ...(space.private != null && { private: space.private })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
