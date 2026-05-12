import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the drive item. Example: "5D33DD65C6932946!70859"')
});

const IdentitySetSchema = z.object({
    user: z
        .object({
            id: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    application: z
        .object({
            id: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional(),
    device: z
        .object({
            id: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional()
});

const SharingLinkSchema = z.object({
    webUrl: z.string().optional(),
    type: z.string().optional(),
    application: z
        .object({
            id: z.string().optional(),
            displayName: z.string().optional()
        })
        .optional()
});

const ItemReferenceSchema = z.object({
    driveId: z.string().optional(),
    id: z.string().optional(),
    path: z.string().optional()
});

const PermissionSchema = z.object({
    id: z.string(),
    roles: z.array(z.string()),
    link: SharingLinkSchema.optional(),
    grantedTo: IdentitySetSchema.optional(),
    grantedToV2: IdentitySetSchema.optional(),
    inheritedFrom: ItemReferenceSchema.optional()
});

const OutputSchema = z.object({
    permissions: z.array(PermissionSchema)
});

const action = createAction({
    description: 'List sharing permissions on an item',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-permissions',
        group: 'Permissions'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read', 'offline_access'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/driveitem-list-permissions
            endpoint: `/v1.0/me/drive/items/${encodeURIComponent(input.itemId)}/permissions`,
            retries: 3
        });

        if (!response.data || !response.data.value) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No permissions found for the specified item',
                itemId: input.itemId
            });
        }

        const permissions = z.array(PermissionSchema).parse(response.data.value);

        return {
            permissions: permissions
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
