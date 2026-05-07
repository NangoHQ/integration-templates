import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the drive item to move or rename. Example: "0123456789abc"'),
    parentFolderId: z.string().optional().describe('The ID of the destination folder to move the item to. If omitted, the item stays in the same location.'),
    name: z.string().optional().describe('The new name for the item. If omitted, the item keeps its current name.')
});

const ParentReferenceSchema = z.object({
    id: z.string().optional()
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    parentReference: ParentReferenceSchema.optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The ID of the moved/renamed item'),
    name: z.string().describe('The name of the item'),
    parentFolderId: z.string().optional().describe('The ID of the parent folder')
});

const action = createAction({
    description: 'Move or rename a file or folder',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/move-item',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.ReadWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: { parentReference?: { id: string }; name?: string } = {};

        if (input.parentFolderId !== undefined) {
            body.parentReference = {
                id: input.parentFolderId
            };
        }

        if (input.name !== undefined) {
            body.name = input.name;
        }

        const response = await nango.patch({
            // https://learn.microsoft.com/graph/api/driveitem-update
            endpoint: `/v1.0/me/drive/items/${encodeURIComponent(input.itemId)}`,
            data: body,
            retries: 3
        });

        const item = ProviderDriveItemSchema.parse(response.data);

        return {
            id: item.id,
            name: item.name || '',
            ...(item.parentReference?.id && { parentFolderId: item.parentReference.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
