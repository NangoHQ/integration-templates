import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().min(1).describe('The ID of the drive item to list permissions for. Example: "123ABC!456"')
});

const PermissionSchema = z
    .object({
        id: z.string(),
        roles: z.array(z.string()).optional(),
        grantedTo: z
            .object({
                user: z
                    .object({
                        id: z.string().optional(),
                        displayName: z.string().optional()
                    })
                    .passthrough()
                    .optional()
            })
            .passthrough()
            .optional(),
        grantedToIdentities: z
            .array(
                z
                    .object({
                        user: z
                            .object({
                                id: z.string().optional(),
                                displayName: z.string().optional()
                            })
                            .passthrough()
                            .optional()
                    })
                    .passthrough()
            )
            .optional(),
        hasPassword: z.boolean().optional(),
        link: z
            .object({
                type: z.string().optional(),
                scope: z.string().optional(),
                webUrl: z.string().optional()
            })
            .passthrough()
            .optional(),
        invitation: z
            .object({
                email: z.string().optional(),
                signInRequired: z.boolean().optional()
            })
            .passthrough()
            .optional(),
        expirationDateTime: z.string().optional(),
        shareId: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    value: z.array(PermissionSchema)
});

const OutputSchema = z.object({
    permissions: z.array(PermissionSchema)
});

const action = createAction({
    description: 'List sharing permissions on an item',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_list_permissions
        const response = await nango.get({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.itemId)}/permissions`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            permissions: providerData.value
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
