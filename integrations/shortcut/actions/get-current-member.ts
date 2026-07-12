import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const ProviderWorkspaceSchema = z.object({
    id: z.string(),
    created_at: z.string().optional().nullable(),
    default_workflow_id: z.number().optional().nullable(),
    estimate_scale: z.array(z.number()).optional().nullable(),
    name: z.string().optional().nullable(),
    url_slug: z.string().optional().nullable(),
    utc_offset: z.string().optional().nullable(),
    korey_enabled: z.boolean().optional().nullable()
});

const ProviderOrganizationSchema = z.object({
    id: z.string()
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    is_owner: z.boolean(),
    mention_name: z.string(),
    name: z.string(),
    role: z.string(),
    workspace2: ProviderWorkspaceSchema,
    organization2: ProviderOrganizationSchema
});

const OutputSchema = z.object({
    id: z.string(),
    is_owner: z.boolean(),
    mention_name: z.string(),
    name: z.string(),
    role: z.string(),
    workspace2: z.object({
        id: z.string(),
        created_at: z.string().optional(),
        default_workflow_id: z.number().optional(),
        estimate_scale: z.array(z.number()).optional(),
        name: z.string().optional(),
        url_slug: z.string().optional(),
        utc_offset: z.string().optional(),
        korey_enabled: z.boolean().optional()
    }),
    organization2: z.object({
        id: z.string()
    })
});

const action = createAction({
    description: 'Get the authenticated member and their workspace context.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.shortcut.com/api/rest/v3#GetCurrentMemberInfo
            endpoint: '/api/v3/member',
            retries: 3
        };

        const response = await nango.get(config);

        const member = ProviderMemberSchema.parse(response.data);

        return {
            id: member.id,
            is_owner: member.is_owner,
            mention_name: member.mention_name,
            name: member.name,
            role: member.role,
            workspace2: {
                id: member.workspace2.id,
                ...(member.workspace2.created_at != null && { created_at: member.workspace2.created_at }),
                ...(member.workspace2.default_workflow_id != null && { default_workflow_id: member.workspace2.default_workflow_id }),
                ...(member.workspace2.estimate_scale != null && { estimate_scale: member.workspace2.estimate_scale }),
                ...(member.workspace2.name != null && { name: member.workspace2.name }),
                ...(member.workspace2.url_slug != null && { url_slug: member.workspace2.url_slug }),
                ...(member.workspace2.utc_offset != null && { utc_offset: member.workspace2.utc_offset }),
                ...(member.workspace2.korey_enabled != null && { korey_enabled: member.workspace2.korey_enabled })
            },
            organization2: {
                id: member.organization2.id
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
