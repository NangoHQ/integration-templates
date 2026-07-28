import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID containing the document. Example: "b!abc123"'),
    itemId: z.string().describe('ID of the Word document (driveItem) to move. Example: "01RFYLAY..."'),
    destinationFolderId: z.string().describe('ID of the destination folder (driveItem) within the same drive. Example: "01RFYLAY..."')
});

const ProviderParentReferenceSchema = z.object({
    id: z.string().optional(),
    driveId: z.string().optional(),
    path: z.string().optional()
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    parentReference: ProviderParentReferenceSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    parentReference: ProviderParentReferenceSchema.optional()
});

const action = createAction({
    description: 'Move a Word document to a different folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.patch({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-move
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}`,
            data: {
                parentReference: {
                    id: input.destinationFolderId
                }
            },
            retries: 3
        });

        const providerItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: providerItem.id,
            ...(providerItem.name !== undefined && { name: providerItem.name }),
            ...(providerItem.webUrl !== undefined && { webUrl: providerItem.webUrl }),
            ...(providerItem.size !== undefined && { size: providerItem.size }),
            ...(providerItem.createdDateTime !== undefined && { createdDateTime: providerItem.createdDateTime }),
            ...(providerItem.lastModifiedDateTime !== undefined && { lastModifiedDateTime: providerItem.lastModifiedDateTime }),
            ...(providerItem.parentReference !== undefined && { parentReference: providerItem.parentReference })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
