import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    page_token: z
        .string()
        .optional()
        .describe(
            'The token for continuing a previous list request. Omit for first request, in which case the action will get a start page token automatically.'
        ),
    drive_id: z.string().optional().describe('The shared drive ID. If specified, changes will be limited to this drive.'),
    include_items_from_all_drives: z.boolean().optional().describe('Whether to include changes from all shared drives. Default: false'),
    include_removed: z.boolean().optional().describe('Whether to include changes indicating items have been removed. Default: true'),
    page_size: z.number().min(1).max(1000).optional().describe('Maximum number of changes to return per page. Default: 100')
});

const FileSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    mime_type: z.union([z.string(), z.null()]),
    modified_time: z.union([z.string(), z.null()])
});

const ChangeSchema = z.object({
    change_type: z.union([z.string(), z.null()]),
    file: z.union([FileSchema, z.null()]),
    file_id: z.string(),
    removed: z.boolean().optional(),
    time: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    changes: z.array(ChangeSchema),
    next_page_token: z.union([z.string(), z.null()]),
    new_start_page_token: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'List changes to files and shared drives',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/list-changes',
        group: 'Changes'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/drive.metadata.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let pageToken = input.page_token;

        // If no page token provided, get the start page token
        if (!pageToken) {
            // https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/getStartPageToken
            const startTokenResponse = await nango.get({
                endpoint: '/drive/v3/changes/startPageToken',
                retries: 3
            });
            pageToken = startTokenResponse.data.startPageToken;
        }

        const params: Record<string, string | number | boolean> = {
            ['pageToken']: pageToken as string
        };

        if (input.drive_id) {
            params['driveId'] = input.drive_id;
        }

        if (input.include_items_from_all_drives !== undefined) {
            params['includeItemsFromAllDrives'] = input.include_items_from_all_drives;
        }

        if (input.include_removed !== undefined) {
            params['includeRemoved'] = input.include_removed;
        } else {
            params['includeRemoved'] = true;
        }

        if (input.page_size) {
            params['pageSize'] = input.page_size;
        }

        // https://developers.google.com/workspace/drive/api/reference/rest/v3/changes/list
        const response = await nango.get({
            endpoint: '/drive/v3/changes',
            params: params as Record<string, string | number>,
            retries: 3
        });

        const changes =
            response.data.changes?.map((change: any) => ({
                change_type: change.changeType ?? null,
                file: change.file
                    ? {
                          id: change.file.id,
                          name: change.file.name ?? null,
                          mime_type: change.file.mimeType ?? null,
                          modified_time: change.file.modifiedTime ?? null
                      }
                    : null,
                file_id: change.fileId,
                removed: change.removed ?? false,
                time: change.time ?? null
            })) || [];

        return {
            changes,
            next_page_token: response.data.nextPageToken || null,
            new_start_page_token: response.data.newStartPageToken || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
