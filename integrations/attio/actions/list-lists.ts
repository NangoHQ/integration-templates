import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({});

const ListIdSchema = z.object({
    workspace_id: z.string(),
    list_id: z.string()
});

const WorkspaceMemberAccessSchema = z.object({
    workspace_member_id: z.string(),
    level: z.enum(['full-access', 'read-and-write', 'read-only'])
});

const CreatedByActorSchema = z.object({
    id: z.string().nullable(),
    type: z.enum(['api-token', 'workspace-member', 'system', 'app']).nullable()
});

const ProviderListSchema = z.object({
    id: ListIdSchema,
    api_slug: z.string(),
    name: z.string(),
    parent_object: z.array(z.string()),
    workspace_access: z.enum(['full-access', 'read-and-write', 'read-only']).nullable(),
    workspace_member_access: z.array(WorkspaceMemberAccessSchema),
    created_by_actor: CreatedByActorSchema,
    created_at: z.string()
});

const OutputListSchema = z.object({
    id: ListIdSchema,
    api_slug: z.string(),
    name: z.string(),
    parent_object: z.array(z.string()),
    workspace_access: z.enum(['full-access', 'read-and-write', 'read-only']).nullable().optional(),
    workspace_member_access: z.array(WorkspaceMemberAccessSchema),
    created_by_actor: CreatedByActorSchema,
    created_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(OutputListSchema)
});

const action = createAction({
    description: 'List lists from Attio.',
    version: '2.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-lists',
        group: 'Lists'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['list_configuration:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/lists
            endpoint: '/v2/lists',
            retries: 3
        };
        const response = await nango.get(config);

        const providerResponse = z
            .object({
                data: z.array(ProviderListSchema)
            })
            .parse(response.data);

        return {
            items: providerResponse.data.map((list) => ({
                id: list.id,
                api_slug: list.api_slug,
                name: list.name,
                parent_object: list.parent_object,
                ...(list.workspace_access !== null && { workspace_access: list.workspace_access }),
                workspace_member_access: list.workspace_member_access,
                created_by_actor: list.created_by_actor,
                created_at: list.created_at
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
