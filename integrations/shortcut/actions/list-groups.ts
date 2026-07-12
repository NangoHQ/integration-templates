import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response. The /groups endpoint does not support cursor pagination; this field is reserved for future use.')
});

const ProviderGroupSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable().optional(),
    color: z.string().nullable().optional(),
    display_icon_id: z.string().uuid().nullable().optional(),
    member_ids: z.array(z.string().uuid()),
    workflow_ids: z.array(z.union([z.string(), z.number()])),
    default_workflow_id: z.union([z.string(), z.number()]).nullable().optional(),
    mention_name: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const GroupSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    color: z.string().optional(),
    display_icon_id: z.string().optional(),
    member_ids: z.array(z.string()),
    workflow_ids: z.array(z.union([z.string(), z.number()])),
    default_workflow_id: z.union([z.string(), z.number()]).optional(),
    mention_name: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(GroupSchema),
    next_cursor: z.string().optional().describe('The /groups endpoint does not return a cursor; this field is reserved for future use.')
});

const action = createAction({
    description: 'List groups (the modern Team concept).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.shortcut.com/api/rest/v3#get-groups
            // The endpoint returns a flat, unpaginated array; it does not accept a cursor param.
            endpoint: '/api/v3/groups',
            retries: 3
        };

        const response = await nango.get(config);

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected a flat array of groups from the Shortcut API.'
            });
        }

        const providerGroups = z.array(ProviderGroupSchema).parse(response.data);

        return {
            items: providerGroups.map((group) => ({
                id: group.id,
                name: group.name,
                ...(group.description != null && { description: group.description }),
                ...(group.color != null && { color: group.color }),
                ...(group.display_icon_id != null && { display_icon_id: group.display_icon_id }),
                member_ids: group.member_ids,
                workflow_ids: group.workflow_ids,
                ...(group.default_workflow_id != null && { default_workflow_id: group.default_workflow_id }),
                ...(group.mention_name != null && { mention_name: group.mention_name }),
                ...(group.created_at != null && { created_at: group.created_at }),
                ...(group.updated_at != null && { updated_at: group.updated_at })
            }))
            // The Shortcut /groups endpoint returns a flat array with no pagination metadata.
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
