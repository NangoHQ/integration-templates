import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    team_id: z.string().describe('The team\'s identifier. Example: "aeadc05e-98a8-11ec-ac2c-da7ad0900001"')
});

const TeamAttributesSchema = z.object({
    avatar: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    handle: z.string(),
    hidden_modules: z.array(z.string()).optional(),
    link_count: z.number().optional(),
    modified_at: z.string().nullable().optional(),
    name: z.string(),
    summary: z.string().nullable().optional(),
    user_count: z.number().optional(),
    visible_modules: z.array(z.string()).optional()
});

const TeamDataSchema = z.object({
    attributes: TeamAttributesSchema,
    id: z.string(),
    type: z.string()
});

const ProviderResponseSchema = z.object({
    data: TeamDataSchema
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    handle: z.string(),
    description: z.string().optional(),
    summary: z.string().optional(),
    avatar: z.string().optional(),
    created_at: z.string().optional(),
    modified_at: z.string().optional(),
    link_count: z.number().optional(),
    user_count: z.number().optional(),
    hidden_modules: z.array(z.string()).optional(),
    visible_modules: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Get a single team by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['teams_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/teams/#get-a-team
            endpoint: `v2/team/${encodeURIComponent(input.team_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Team not found',
                team_id: input.team_id
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const attrs = providerResponse.data.attributes;

        return {
            id: providerResponse.data.id,
            type: providerResponse.data.type,
            name: attrs.name,
            handle: attrs.handle,
            ...(attrs.description != null && { description: attrs.description }),
            ...(attrs.summary != null && { summary: attrs.summary }),
            ...(attrs.avatar != null && { avatar: attrs.avatar }),
            ...(attrs.created_at != null && { created_at: attrs.created_at }),
            ...(attrs.modified_at != null && { modified_at: attrs.modified_at }),
            ...(attrs.link_count !== undefined && { link_count: attrs.link_count }),
            ...(attrs.user_count !== undefined && { user_count: attrs.user_count }),
            ...(attrs.hidden_modules !== undefined && { hidden_modules: attrs.hidden_modules }),
            ...(attrs.visible_modules !== undefined && { visible_modules: attrs.visible_modules })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
