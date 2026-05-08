import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The ID of the driveItem to move or rename. Example: "0123456789abc!123"'),
    parent_reference: z
        .object({
            id: z.string().optional().describe('The ID of the new parent folder. Example: "0123456789abc!456"'),
            path: z.string().optional().describe('The path to the new parent folder. Example: "/drive/root:/NewFolder"')
        })
        .optional()
        .describe('Reference to the new parent folder for moving the item. Provide either id or path.'),
    name: z.string().optional().describe('The new name for the item. Example: "NewFileName.txt"')
});

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    parentReference: z
        .object({
            id: z.string().optional(),
            path: z.string().optional()
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
    parent_reference: z
        .object({
            id: z.string().optional(),
            path: z.string().optional()
        })
        .optional(),
    web_url: z.string().optional(),
    size: z.number().optional(),
    created_date_time: z.string().optional(),
    last_modified_date_time: z.string().optional()
});

const action = createAction({
    description: 'Move or rename a file or folder in OneDrive Personal.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/move-item',
        group: 'Files'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readwrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};

        if (input.parent_reference !== undefined) {
            payload['parentReference'] = {};
            if (input.parent_reference.id !== undefined) {
                payload['parentReference'] = { id: input.parent_reference.id };
            } else if (input.parent_reference.path !== undefined) {
                payload['parentReference'] = { path: input.parent_reference.path };
            }
        }

        if (input.name !== undefined) {
            payload['name'] = input.name;
        }

        if (Object.keys(payload).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_request',
                message: 'At least one of parent_reference or name must be provided to move or rename the item.'
            });
        }

        // https://learn.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_update
        const response = await nango.patch({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.item_id)}`,
            data: payload,
            retries: 3
        });

        const validated = ProviderDriveItemSchema.safeParse(response.data);

        if (!validated.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'The API returned an unexpected response format.',
                details: validated.error.issues
            });
        }

        const providerItem = validated.data;

        return {
            id: providerItem.id,
            name: providerItem.name,
            ...(providerItem.parentReference !== undefined && {
                parent_reference: {
                    ...(providerItem.parentReference.id !== undefined && { id: providerItem.parentReference.id }),
                    ...(providerItem.parentReference.path !== undefined && { path: providerItem.parentReference.path })
                }
            }),
            ...(providerItem.webUrl !== undefined && { web_url: providerItem.webUrl }),
            ...(providerItem.size !== undefined && { size: providerItem.size }),
            ...(providerItem.createdDateTime !== undefined && { created_date_time: providerItem.createdDateTime }),
            ...(providerItem.lastModifiedDateTime !== undefined && { last_modified_date_time: providerItem.lastModifiedDateTime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
