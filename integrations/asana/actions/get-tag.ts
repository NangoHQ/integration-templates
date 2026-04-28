import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    tag_gid: z.string().describe('The globally unique identifier of the tag to fetch. Example: "12345"')
});

const ProviderWorkspaceSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const ProviderFollowerSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional()
});

const ProviderTagSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional(),
    color: z.string().nullable().optional(),
    notes: z.string().optional(),
    created_at: z.string().optional(),
    followers: z.array(ProviderFollowerSchema).optional(),
    workspace: ProviderWorkspaceSchema.optional(),
    permalink_url: z.string().optional()
});

const AsanaResponseSchema = z.object({
    data: z.unknown()
});

const OutputSchema = z.object({
    gid: z.string(),
    resource_type: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
    notes: z.string().optional(),
    created_at: z.string().optional(),
    followers: z
        .array(
            z.object({
                gid: z.string(),
                resource_type: z.string(),
                name: z.string().optional()
            })
        )
        .optional(),
    workspace: z
        .object({
            gid: z.string(),
            resource_type: z.string(),
            name: z.string().optional()
        })
        .optional(),
    permalink_url: z.string().optional()
});

const action = createAction({
    description: 'Fetch a single tag by gid.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-tag',
        group: 'Tags'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tags:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.asana.com/reference/gettag
            endpoint: `/api/1.0/tags/${input.tag_gid}`,
            params: {
                opt_fields: 'gid,resource_type,name,color,notes,created_at,followers,workspace,permalink_url'
            },
            retries: 3,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        const response = await nango.get(config);

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Tag not found',
                tag_gid: input.tag_gid
            });
        }

        const responseWrapper = AsanaResponseSchema.parse(response.data);
        const providerTag = ProviderTagSchema.parse(responseWrapper.data);

        return {
            gid: providerTag.gid,
            resource_type: providerTag.resource_type,
            ...(providerTag.name !== undefined && { name: providerTag.name }),
            ...(providerTag.color != null && { color: providerTag.color }),
            ...(providerTag.notes !== undefined && { notes: providerTag.notes }),
            ...(providerTag.created_at !== undefined && { created_at: providerTag.created_at }),
            ...(providerTag.followers !== undefined && {
                followers: providerTag.followers.map((follower) => ({
                    gid: follower.gid,
                    resource_type: follower.resource_type,
                    ...(follower.name !== undefined && { name: follower.name })
                }))
            }),
            ...(providerTag.workspace !== undefined && {
                workspace: {
                    gid: providerTag.workspace.gid,
                    resource_type: providerTag.workspace.resource_type,
                    ...(providerTag.workspace.name !== undefined && { name: providerTag.workspace.name })
                }
            }),
            ...(providerTag.permalink_url !== undefined && { permalink_url: providerTag.permalink_url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
