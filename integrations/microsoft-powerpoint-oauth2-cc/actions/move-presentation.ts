import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!abc123"'),
    itemId: z.string().describe('Item ID of the presentation to move. Example: "01RFYLAY..."'),
    destinationFolderId: z.string().describe('Item ID of the destination folder. Example: "01RFYLAY..."')
});

const ParentReferenceSchema = z.object({
    id: z.string().optional(),
    driveId: z.string().optional(),
    path: z.string().optional()
});

const FileSchema = z.object({
    mimeType: z.string().optional()
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().nullable().optional(),
    size: z.number().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    lastModifiedDateTime: z.string().nullable().optional(),
    parentReference: ParentReferenceSchema.optional(),
    file: FileSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    parentReference: ParentReferenceSchema.optional(),
    file: FileSchema.optional()
});

const action = createAction({
    description: 'Move a presentation to a different folder.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/driveitem-move
        const response = await nango.patch({
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}`,
            data: {
                parentReference: {
                    id: input.destinationFolderId
                }
            },
            retries: 3
        });

        const driveItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: driveItem.id,
            ...(driveItem.name !== undefined && { name: driveItem.name }),
            ...(driveItem.webUrl != null && { webUrl: driveItem.webUrl }),
            ...(driveItem.size != null && { size: driveItem.size }),
            ...(driveItem.createdDateTime != null && { createdDateTime: driveItem.createdDateTime }),
            ...(driveItem.lastModifiedDateTime != null && { lastModifiedDateTime: driveItem.lastModifiedDateTime }),
            ...(driveItem.parentReference !== undefined && { parentReference: driveItem.parentReference }),
            ...(driveItem.file !== undefined && { file: driveItem.file })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
