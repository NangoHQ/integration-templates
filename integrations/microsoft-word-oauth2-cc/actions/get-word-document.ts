import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z.string().describe('The ID of the drive containing the document. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('The ID of the Word document (driveItem). Example: "01RFYLAYGCHWM67HNJIZBJNCQTFNXT6YGT"')
});

const ProviderIdentitySchema = z
    .object({
        displayName: z.string().optional().nullable(),
        id: z.string().optional().nullable()
    })
    .optional()
    .nullable();

const ProviderIdentitySetSchema = z
    .object({
        user: ProviderIdentitySchema,
        application: ProviderIdentitySchema,
        device: ProviderIdentitySchema
    })
    .optional()
    .nullable();

const ProviderDriveItemSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        webUrl: z.string().optional().nullable(),
        createdDateTime: z.string().optional().nullable(),
        lastModifiedDateTime: z.string().optional().nullable(),
        size: z.number().optional().nullable(),
        file: z
            .object({
                mimeType: z.string().optional().nullable()
            })
            .optional()
            .nullable(),
        parentReference: z
            .object({
                driveId: z.string().optional().nullable(),
                id: z.string().optional().nullable()
            })
            .optional()
            .nullable(),
        createdBy: ProviderIdentitySetSchema,
        lastModifiedBy: ProviderIdentitySetSchema
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    webUrl: z.string().optional(),
    createdDateTime: z.string().optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional(),
    mimeType: z.string().optional(),
    parentReference: z
        .object({
            driveId: z.string().optional(),
            id: z.string().optional()
        })
        .optional(),
    createdBy: z
        .object({
            displayName: z.string().optional(),
            id: z.string().optional()
        })
        .optional(),
    lastModifiedBy: z
        .object({
            displayName: z.string().optional(),
            id: z.string().optional()
        })
        .optional()
});

const mapIdentity = (identitySet: z.infer<typeof ProviderIdentitySetSchema>): { displayName?: string; id?: string } | undefined => {
    const identity = identitySet?.user ?? identitySet?.application ?? identitySet?.device;
    if (identity == null) {
        return undefined;
    }
    const mapped = {
        ...(identity.displayName != null && { displayName: identity.displayName }),
        ...(identity.id != null && { id: identity.id })
    };
    return Object.keys(mapped).length > 0 ? mapped : undefined;
};

const action = createAction({
    description: 'Retrieve metadata for a Word document (driveItem).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-get
            endpoint: `/v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}`,
            retries: 3
        });

        const providerItem = ProviderDriveItemSchema.parse(response.data);

        return {
            id: providerItem.id,
            name: providerItem.name,
            ...(providerItem.webUrl != null && { webUrl: providerItem.webUrl }),
            ...(providerItem.createdDateTime != null && { createdDateTime: providerItem.createdDateTime }),
            ...(providerItem.lastModifiedDateTime != null && { lastModifiedDateTime: providerItem.lastModifiedDateTime }),
            ...(providerItem.size != null && { size: providerItem.size }),
            ...(providerItem.file?.mimeType != null && { mimeType: providerItem.file.mimeType }),
            ...(providerItem.parentReference != null && {
                parentReference: {
                    ...(providerItem.parentReference.driveId != null && { driveId: providerItem.parentReference.driveId }),
                    ...(providerItem.parentReference.id != null && { id: providerItem.parentReference.id })
                }
            }),
            ...(mapIdentity(providerItem.createdBy) != null && { createdBy: mapIdentity(providerItem.createdBy) }),
            ...(mapIdentity(providerItem.lastModifiedBy) != null && { lastModifiedBy: mapIdentity(providerItem.lastModifiedBy) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
