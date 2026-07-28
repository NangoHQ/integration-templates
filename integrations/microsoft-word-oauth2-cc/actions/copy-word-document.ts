import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z
        .string()
        .describe('The ID of the drive containing the source document. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('The ID of the Word document to copy. Example: "01RFYLAYGCHWM67HNJIZBJNCQTFNXT6YGT"'),
    name: z.string().optional().describe('Optional new name for the copied document. If omitted, the same name is used.'),
    destinationDriveId: z.string().optional().describe('Optional ID of the destination drive. Defaults to the source drive if omitted.'),
    destinationFolderId: z
        .string()
        .optional()
        .describe('Optional ID of the destination folder. If omitted, the copy is placed in the same folder as the source.')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    webUrl: z.string().optional().nullable(),
    size: z.number().optional().nullable(),
    createdDateTime: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    location: z.string().optional().describe('Polling URL for async copy status when the copy is not completed synchronously.')
});

const action = createAction({
    description: 'Copy a Word document to a (possibly different) folder, optionally renaming it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {};

        if (input.name !== undefined) {
            requestBody['name'] = input.name;
        }

        if (input.destinationFolderId !== undefined) {
            const parentReference: Record<string, unknown> = {
                id: input.destinationFolderId
            };

            if (input.destinationDriveId !== undefined) {
                parentReference['driveId'] = input.destinationDriveId;
            }

            requestBody['parentReference'] = parentReference;
        }

        const response = await nango.post({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-copy
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/copy`,
            data: requestBody,
            retries: 1
        });

        const location = response.headers?.['location'] || response.headers?.['Location'];

        if (response.status === 202) {
            if (typeof location === 'string') {
                return { location };
            }

            return {};
        }

        if (!response.data || typeof response.data !== 'object') {
            if (typeof location === 'string') {
                return { location };
            }

            return {};
        }

        const providerItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: providerItem.id,
            name: providerItem.name,
            ...(providerItem.webUrl != null && { webUrl: providerItem.webUrl }),
            ...(providerItem.size != null && { size: providerItem.size }),
            ...(providerItem.createdDateTime != null && { createdDateTime: providerItem.createdDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
