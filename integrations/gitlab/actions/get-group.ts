import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.union([z.string(), z.number()]).describe('The ID or URL-encoded path of the group. Example: "133159324"')
});

const ProviderGroupSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        path: z.string(),
        description: z.string().nullable().optional(),
        visibility: z.string().optional(),
        avatar_url: z.string().nullable().optional(),
        web_url: z.string().optional(),
        request_access_enabled: z.boolean().optional(),
        repository_storage: z.string().optional(),
        full_name: z.string().optional(),
        full_path: z.string().optional(),
        file_template_project_id: z.number().nullable().optional(),
        parent_id: z.number().nullable().optional(),
        created_at: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        path: z.string(),
        description: z.string().optional(),
        visibility: z.string().optional(),
        avatar_url: z.string().optional(),
        web_url: z.string().optional(),
        request_access_enabled: z.boolean().optional(),
        repository_storage: z.string().optional(),
        full_name: z.string().optional(),
        full_path: z.string().optional(),
        file_template_project_id: z.number().optional(),
        parent_id: z.number().optional(),
        created_at: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single group from GitLab.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-group',
        group: 'Groups'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.gitlab.com/api/groups/#get-a-single-group
            endpoint: `/api/v4/groups/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Group not found',
                id: input.id
            });
        }

        const providerGroup = ProviderGroupSchema.parse(response.data);

        return {
            id: providerGroup.id,
            name: providerGroup.name,
            path: providerGroup.path,
            ...(providerGroup.description != null && { description: providerGroup.description }),
            ...(providerGroup.visibility !== undefined && { visibility: providerGroup.visibility }),
            ...(providerGroup.avatar_url != null && { avatar_url: providerGroup.avatar_url }),
            ...(providerGroup.web_url !== undefined && { web_url: providerGroup.web_url }),
            ...(providerGroup.request_access_enabled !== undefined && { request_access_enabled: providerGroup.request_access_enabled }),
            ...(providerGroup.repository_storage !== undefined && { repository_storage: providerGroup.repository_storage }),
            ...(providerGroup.full_name !== undefined && { full_name: providerGroup.full_name }),
            ...(providerGroup.full_path !== undefined && { full_path: providerGroup.full_path }),
            ...(providerGroup.file_template_project_id != null && { file_template_project_id: providerGroup.file_template_project_id }),
            ...(providerGroup.parent_id != null && { parent_id: providerGroup.parent_id }),
            ...(providerGroup.created_at !== undefined && { created_at: providerGroup.created_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
