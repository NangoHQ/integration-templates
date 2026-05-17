import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The unique identifier of the drive item to update. Example: "0123456789abc"'),
    name: z.string().optional().describe('New name for the item.'),
    description: z.string().nullable().optional().describe('New description for the item. Use null to clear.'),
    parentReference: z
        .object({
            id: z.string().describe('The ID of the parent folder.'),
            driveId: z.string().optional().describe('The ID of the drive containing the parent folder.')
        })
        .optional()
        .describe('New parent folder reference to move the item.'),
    fileSystemInfo: z
        .object({
            createdDateTime: z.string().optional().describe('The UTC date and time the file was created on the client.'),
            lastModifiedDateTime: z.string().optional().describe('The UTC date and time the file was last modified on the client.')
        })
        .optional()
        .describe('File system info to update.')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    parentReference: z
        .object({
            id: z.string(),
            driveId: z.string().optional()
        })
        .optional(),
    fileSystemInfo: z
        .object({
            createdDateTime: z.string().optional(),
            lastModifiedDateTime: z.string().optional()
        })
        .optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    parentReference: z
        .object({
            id: z.string(),
            driveId: z.string().optional()
        })
        .optional(),
    fileSystemInfo: z
        .object({
            createdDateTime: z.string().optional(),
            lastModifiedDateTime: z.string().optional()
        })
        .optional(),
    webUrl: z.string().optional(),
    size: z.number().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional()
});

const action = createAction({
    description: 'Update mutable file or folder metadata.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-item',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: {
            name?: string;
            description?: string | null;
            parentReference?: { id: string; driveId?: string };
            fileSystemInfo?: { createdDateTime?: string; lastModifiedDateTime?: string };
        } = {};

        if (input.name !== undefined) {
            updateData.name = input.name;
        }

        if (input.description !== undefined) {
            updateData.description = input.description;
        }

        if (input.parentReference !== undefined) {
            updateData.parentReference = {
                id: input.parentReference.id,
                ...(input.parentReference.driveId !== undefined && { driveId: input.parentReference.driveId })
            };
        }

        if (input.fileSystemInfo !== undefined) {
            updateData.fileSystemInfo = {
                ...(input.fileSystemInfo.createdDateTime !== undefined && { createdDateTime: input.fileSystemInfo.createdDateTime }),
                ...(input.fileSystemInfo.lastModifiedDateTime !== undefined && { lastModifiedDateTime: input.fileSystemInfo.lastModifiedDateTime })
            };
        }

        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_update
        const response = await nango.patch({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.itemId)}`,
            data: updateData,
            retries: 3
        });

        const providerItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: providerItem.id,
            name: providerItem.name,
            ...(providerItem.description != null && { description: providerItem.description }),
            ...(providerItem.parentReference !== undefined && {
                parentReference: {
                    id: providerItem.parentReference.id,
                    ...(providerItem.parentReference.driveId !== undefined && { driveId: providerItem.parentReference.driveId })
                }
            }),
            ...(providerItem.fileSystemInfo !== undefined && {
                fileSystemInfo: {
                    ...(providerItem.fileSystemInfo.createdDateTime !== undefined && { createdDateTime: providerItem.fileSystemInfo.createdDateTime }),
                    ...(providerItem.fileSystemInfo.lastModifiedDateTime !== undefined && {
                        lastModifiedDateTime: providerItem.fileSystemInfo.lastModifiedDateTime
                    })
                }
            }),
            ...(providerItem.webUrl !== undefined && { webUrl: providerItem.webUrl }),
            ...(providerItem.size !== undefined && { size: providerItem.size }),
            ...(providerItem.createdDateTime !== undefined && { createdDateTime: providerItem.createdDateTime }),
            ...(providerItem.lastModifiedDateTime !== undefined && { lastModifiedDateTime: providerItem.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
