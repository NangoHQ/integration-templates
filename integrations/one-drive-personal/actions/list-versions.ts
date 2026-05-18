import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    itemId: z.string().describe('The ID of the file item. Example: "0123456789abc"')
});

const IdentitySetSchema = z.object({
    user: z
        .object({
            displayName: z.string().optional(),
            email: z.string().optional()
        })
        .optional()
});

const VersionSchema = z.object({
    id: z.string(),
    lastModifiedBy: IdentitySetSchema.optional(),
    lastModifiedDateTime: z.string().optional(),
    size: z.number().optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(VersionSchema)
});

const OutputSchema = z.object({
    versions: z.array(
        z.object({
            id: z.string(),
            lastModifiedBy: z
                .object({
                    displayName: z.string().optional(),
                    email: z.string().optional()
                })
                .optional(),
            lastModifiedDateTime: z.string().optional(),
            size: z.number().optional()
        })
    )
});

const action = createAction({
    description: 'List versions for a file.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-versions',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['onedrive.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/onedrive/developer/rest-api/api/driveitem_list_versions
        const response = await nango.get({
            endpoint: `/v1.0/drive/items/${encodeURIComponent(input.itemId)}/versions`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const versions = providerResponse.value.map((version) => ({
            id: version.id,
            ...(version.lastModifiedBy !== undefined && {
                lastModifiedBy: {
                    ...(version.lastModifiedBy.user?.displayName !== undefined && {
                        displayName: version.lastModifiedBy.user.displayName
                    }),
                    ...(version.lastModifiedBy.user?.email !== undefined && {
                        email: version.lastModifiedBy.user.email
                    })
                }
            }),
            ...(version.lastModifiedDateTime !== undefined && {
                lastModifiedDateTime: version.lastModifiedDateTime
            }),
            ...(version.size !== undefined && { size: version.size })
        }));

        return { versions };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
