import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,1a2b3c4d,1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p"'),
    driveId: z.string().describe('Drive ID. Example: "b!1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f"'),
    itemId: z.string().describe('Drive item ID. Example: "01A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z7A8B9C0D1E2F"')
});

const DriveItemFileSchema = z
    .object({
        mimeType: z.string().optional()
    })
    .optional();

const DriveItemFolderSchema = z
    .object({
        childCount: z.number().optional()
    })
    .optional();

const ParentReferenceSchema = z
    .object({
        driveId: z.string().optional(),
        id: z.string().optional(),
        path: z.string().optional()
    })
    .optional();

const IdentitySchema = z
    .object({
        displayName: z.string().optional()
    })
    .optional();

const IdentitySetSchema = z
    .object({
        user: IdentitySchema
    })
    .optional();

const ProviderDriveItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    file: DriveItemFileSchema,
    folder: DriveItemFolderSchema,
    parentReference: ParentReferenceSchema,
    createdBy: IdentitySetSchema,
    lastModifiedBy: IdentitySetSchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    size: z.number().optional(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    mimeType: z.string().optional(),
    folderChildCount: z.number().optional(),
    parentDriveId: z.string().optional(),
    parentItemId: z.string().optional(),
    parentPath: z.string().optional(),
    createdByDisplayName: z.string().optional(),
    lastModifiedByDisplayName: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a file or folder from a site drive.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-drive-item',
        group: 'Drives'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/driveitem-get
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Drive item not found',
                siteId: input.siteId,
                driveId: input.driveId,
                itemId: input.itemId
            });
        }

        const providerItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: providerItem.id,
            ...(providerItem.name !== undefined && { name: providerItem.name }),
            ...(providerItem.size !== undefined && { size: providerItem.size }),
            ...(providerItem.webUrl !== undefined && { webUrl: providerItem.webUrl }),
            ...(providerItem.createdDateTime !== undefined && { createdDateTime: providerItem.createdDateTime }),
            ...(providerItem.lastModifiedDateTime !== undefined && { lastModifiedDateTime: providerItem.lastModifiedDateTime }),
            ...(providerItem.file?.mimeType !== undefined && { mimeType: providerItem.file.mimeType }),
            ...(providerItem.folder?.childCount !== undefined && { folderChildCount: providerItem.folder.childCount }),
            ...(providerItem.parentReference?.driveId !== undefined && { parentDriveId: providerItem.parentReference.driveId }),
            ...(providerItem.parentReference?.id !== undefined && { parentItemId: providerItem.parentReference.id }),
            ...(providerItem.parentReference?.path !== undefined && { parentPath: providerItem.parentReference.path }),
            ...(providerItem.createdBy?.user?.displayName !== undefined && { createdByDisplayName: providerItem.createdBy.user.displayName }),
            ...(providerItem.lastModifiedBy?.user?.displayName !== undefined && { lastModifiedByDisplayName: providerItem.lastModifiedBy.user.displayName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
