import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    path: z.string().describe('Dropbox path to the folder to share. Example: "/my-folder"'),
    force_async: z.boolean().optional().describe('If true, force the share operation to run asynchronously'),
    member_policy: z.enum(['anyone', 'team']).optional().describe('Who can be a member of this shared folder'),
    shared_link_policy: z.enum(['anyone', 'members']).optional().describe('Who can access shared links for the folder'),
    viewer_info_policy: z.enum(['disabled', 'enabled']).optional().describe('Whether to enable viewer info for this folder'),
    access_inheritance: z.enum(['inherit', 'no_inherit']).optional().describe('How access levels are inherited')
});

const AsyncJobIdSchema = z.object({
    '.tag': z.literal('async_job_id'),
    async_job_id: z.string()
});

const CompleteSchema = z.object({
    '.tag': z.literal('complete'),
    access_type: z.object({ '.tag': z.string() }).optional(),
    is_team_folder: z.boolean().optional(),
    is_inside_team_folder: z.boolean().optional(),
    name: z.string(),
    policy: z
        .object({
            acl_update_policy: z.object({ '.tag': z.string() }).optional(),
            shared_link_policy: z.object({ '.tag': z.string() }).optional(),
            viewer_info_policy: z.object({ '.tag': z.string() }).optional()
        })
        .optional(),
    preview_url: z.string().optional(),
    path_lower: z.string().optional(),
    shared_folder_id: z.string(),
    time_invited: z.string().optional(),
    owner_team: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional(),
    parent_shared_folder_id: z.string().optional()
});

const OutputSchema = z.object({
    success: z.boolean(),
    async_job_id: z.string().optional(),
    shared_folder_metadata: z
        .object({
            shared_folder_id: z.string(),
            name: z.string(),
            path_lower: z.string().optional(),
            preview_url: z.string().optional(),
            access_type: z.string().optional(),
            is_team_folder: z.boolean().optional(),
            is_inside_team_folder: z.boolean().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Turn a Dropbox folder into a shared folder for collaborators',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['sharing.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            path: input.path
        };

        if (input['force_async'] !== undefined) {
            requestBody['force_async'] = input['force_async'];
        }
        if (input['member_policy'] !== undefined) {
            requestBody['member_policy'] = { '.tag': input['member_policy'] };
        }
        if (input['shared_link_policy'] !== undefined) {
            requestBody['shared_link_policy'] = { '.tag': input['shared_link_policy'] };
        }
        if (input['viewer_info_policy'] !== undefined) {
            requestBody['viewer_info_policy'] = { '.tag': input['viewer_info_policy'] };
        }
        if (input['access_inheritance'] !== undefined) {
            requestBody['access_inheritance'] = { '.tag': input['access_inheritance'] };
        }

        // https://www.dropbox.com/developers/documentation/http/documentation#sharing-share_folder
        const response = await nango.post({
            endpoint: '/2/sharing/share_folder',
            data: requestBody,
            retries: 3
        });

        if (typeof response.data !== 'object' || response.data === null) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Expected object response from Dropbox API'
            });
        }

        const responseData = response.data;
        const tagValue = z.string().optional().parse(responseData['.tag']);

        // Handle async job ID response
        if (tagValue === 'async_job_id') {
            const asyncResult = AsyncJobIdSchema.parse(responseData);
            return {
                success: false,
                async_job_id: asyncResult.async_job_id
            };
        }

        // Handle complete response (synchronous)
        if (tagValue === 'complete') {
            const completeData = CompleteSchema.parse(responseData);
            return {
                success: true,
                shared_folder_metadata: {
                    shared_folder_id: completeData.shared_folder_id,
                    name: completeData.name,
                    path_lower: completeData.path_lower,
                    preview_url: completeData.preview_url,
                    access_type: completeData.access_type?.['.tag'],
                    is_team_folder: completeData.is_team_folder,
                    is_inside_team_folder: completeData.is_inside_team_folder
                }
            };
        }

        // Handle direct folder metadata response (no .tag field)
        if (typeof responseData['shared_folder_id'] === 'string') {
            const FolderMetadataSchema = z.object({
                shared_folder_id: z.string(),
                name: z.string(),
                path_lower: z.string().optional(),
                preview_url: z.string().optional(),
                access_type: z.object({ '.tag': z.string() }).optional(),
                is_team_folder: z.boolean().optional(),
                is_inside_team_folder: z.boolean().optional()
            });
            const folderData = FolderMetadataSchema.parse(responseData);
            return {
                success: true,
                shared_folder_metadata: {
                    shared_folder_id: folderData.shared_folder_id,
                    name: folderData.name,
                    path_lower: folderData.path_lower,
                    preview_url: folderData.preview_url,
                    access_type: folderData.access_type?.['.tag'],
                    is_team_folder: folderData.is_team_folder,
                    is_inside_team_folder: folderData.is_inside_team_folder
                }
            };
        }

        throw new nango.ActionError({
            type: 'unexpected_response',
            message: 'Unexpected response format from Dropbox API',
            response_tag: String(tagValue)
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
