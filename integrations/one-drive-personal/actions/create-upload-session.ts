import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    parent_item_id: z.string().describe('The ID of the parent folder where the file will be uploaded. Example: "01ABCDEF123456789"'),
    file_name: z.string().describe('The name of the file to be uploaded. Example: "document.pdf"'),
    file_description: z.string().optional().describe('Optional description for the file.'),
    file_system_info: z
        .object({
            created_date_time: z.string().optional().describe('Optional created date time in ISO 8601 format.'),
            last_modified_date_time: z.string().optional().describe('Optional last modified date time in ISO 8601 format.')
        })
        .optional()
        .describe('Optional file system info for the file.')
});

const ProviderResponseSchema = z.object({
    uploadUrl: z.string(),
    expirationDateTime: z.string(),
    nextExpectedRanges: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    upload_url: z.string().describe('The URL endpoint for uploading file bytes via byte-range PUT requests.'),
    expiration_date_time: z.string().describe('The expiration date/time in ISO 8601 format for the upload session.'),
    next_expected_ranges: z.array(z.string()).optional().describe('Zero or more byte ranges indicating what data has been received.')
});

const action = createAction({
    description: 'Start a resumable upload session for a large file to OneDrive personal drive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-upload-session',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['offline_access', 'onedrive.readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_createuploadsession
        const item: Record<string, unknown> = {};

        if (input.file_description !== undefined) {
            item['description'] = input.file_description;
        }

        if (input.file_system_info !== undefined) {
            const fsInfo: Record<string, string> = {};
            if (input.file_system_info.created_date_time !== undefined) {
                fsInfo['createdDateTime'] = input.file_system_info.created_date_time;
            }
            if (input.file_system_info.last_modified_date_time !== undefined) {
                fsInfo['lastModifiedDateTime'] = input.file_system_info.last_modified_date_time;
            }
            if (Object.keys(fsInfo).length > 0) {
                item['fileSystemInfo'] = fsInfo;
            }
        }

        // https://learn.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_createuploadsession
        const response = await nango.post({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.parent_item_id)}:/${encodeURIComponent(input.file_name)}:/createUploadSession`,
            data: { item },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            upload_url: providerData.uploadUrl,
            expiration_date_time: providerData.expirationDateTime,
            ...(providerData.nextExpectedRanges !== undefined && { next_expected_ranges: providerData.nextExpectedRanges })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
