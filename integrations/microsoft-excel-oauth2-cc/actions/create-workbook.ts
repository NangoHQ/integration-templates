import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    drive_id: z.string().describe('Drive ID. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    filename: z.string().describe('Filename including .xlsx extension. Example: "workbook.xlsx"'),
    parent_id: z.string().optional().describe('Parent folder item ID. If omitted, uploads to the drive root.'),
    content_base64: z.string().describe('Base64-encoded .xlsx file content.')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Upload a new .xlsx workbook to a drive folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fileBuffer = Buffer.from(input.content_base64, 'base64');

        const endpoint = input.parent_id
            ? `/v1.0/drives/${encodeURIComponent(input.drive_id)}/items/${encodeURIComponent(input.parent_id)}:/${encodeURIComponent(input.filename)}:/content`
            : `/v1.0/drives/${encodeURIComponent(input.drive_id)}/root:/${encodeURIComponent(input.filename)}:/content`;

        // https://learn.microsoft.com/en-us/graph/api/driveitem-put-content
        const response = await nango.put({
            endpoint,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            },
            data: fileBuffer,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'upload_failed',
                message: 'Failed to upload workbook - no response data received'
            });
        }

        const providerDriveItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: providerDriveItem.id,
            name: providerDriveItem.name,
            ...(providerDriveItem.webUrl != null && { webUrl: providerDriveItem.webUrl }),
            ...(providerDriveItem.size != null && { size: providerDriveItem.size }),
            ...(providerDriveItem.createdDateTime != null && { createdDateTime: providerDriveItem.createdDateTime }),
            ...(providerDriveItem.lastModifiedDateTime != null && { lastModifiedDateTime: providerDriveItem.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
