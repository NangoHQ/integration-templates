import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().min(1).max(1000).optional().describe('The maximum number of results to return per request. Default is 100.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const AccessTypeSchema = z.object({
    '.tag': z.string()
});

const PolicySchema = z.object({
    acl_update_policy: z.object({ '.tag': z.string() }).optional(),
    shared_link_policy: z.object({ '.tag': z.string() }).optional(),
    member_policy: z.object({ '.tag': z.string() }).optional(),
    resolved_member_policy: z.object({ '.tag': z.string() }).optional()
});

const AccessInheritanceSchema = z.object({
    '.tag': z.string()
});

const SharedFolderMetadataSchema = z.object({
    access_type: AccessTypeSchema,
    is_inside_team_folder: z.boolean(),
    is_team_folder: z.boolean(),
    name: z.string(),
    policy: PolicySchema,
    preview_url: z.string(),
    shared_folder_id: z.string(),
    time_invited: z.string(),
    path_lower: z.string().optional(),
    permissions: z.array(z.unknown()).optional(),
    access_inheritance: AccessInheritanceSchema.optional()
});

const ProviderResponseSchema = z.object({
    entries: z.array(SharedFolderMetadataSchema),
    cursor: z.string().optional()
});

const SharedFolderSchema = z.object({
    shared_folder_id: z.string(),
    name: z.string(),
    path_lower: z.string().optional(),
    preview_url: z.string(),
    access_type: z.string(),
    is_team_folder: z.boolean(),
    is_inside_team_folder: z.boolean(),
    time_invited: z.string()
});

const OutputSchema = z.object({
    folders: z.array(SharedFolderSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List shared folders available to the current Dropbox user.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-shared-folders',
        group: 'Sharing'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['sharing.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 100;

        let response;
        if (input.cursor) {
            // https://www.dropbox.com/developers/documentation/http/documentation#sharing-list_folders-continue
            response = await nango.post({
                endpoint: '/2/sharing/list_folders/continue',
                data: {
                    cursor: input.cursor
                },
                retries: 3
            });
        } else {
            // https://www.dropbox.com/developers/documentation/http/documentation#sharing-list_folders
            response = await nango.post({
                endpoint: '/2/sharing/list_folders',
                data: {
                    limit: limit
                },
                retries: 3
            });
        }

        const providerData = ProviderResponseSchema.parse(response.data);

        const folders = providerData.entries.map((entry) => ({
            shared_folder_id: entry.shared_folder_id,
            name: entry.name,
            ...(entry.path_lower !== undefined && { path_lower: entry.path_lower }),
            preview_url: entry.preview_url,
            access_type: entry.access_type['.tag'],
            is_team_folder: entry.is_team_folder,
            is_inside_team_folder: entry.is_inside_team_folder,
            time_invited: entry.time_invited
        }));

        return {
            folders: folders,
            ...(providerData.cursor !== undefined && { next_cursor: providerData.cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
