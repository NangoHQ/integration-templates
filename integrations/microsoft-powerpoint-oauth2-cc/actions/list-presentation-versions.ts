import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    driveId: z
        .string()
        .describe('The ID of the drive containing the presentation. Example: "b!PkCXTGMWc0aQ-tL4aQtFEDRX0SkZPfZDl2tD7OP_gahvi-nd5TAvTJG6KTmx6Mm0"'),
    itemId: z.string().describe('The ID of the presentation item. Example: "01RFYLAYBX27CGEGAJH5HZMVYI6Y3NGGYJ"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderVersionSchema = z
    .object({
        id: z.string(),
        lastModifiedDateTime: z.string().optional(),
        lastModifiedBy: z
            .object({
                user: z
                    .object({
                        displayName: z.string().optional(),
                        email: z.string().optional()
                    })
                    .optional()
            })
            .optional(),
        size: z.number().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    value: z.array(ProviderVersionSchema).optional(),
    '@odata.nextLink': z.string().optional()
});

const OutputSchema = z.object({
    versions: z.array(
        z.object({
            id: z.string(),
            lastModifiedDateTime: z.string().optional(),
            lastModifiedBy: z
                .object({
                    user: z
                        .object({
                            displayName: z.string().optional(),
                            email: z.string().optional()
                        })
                        .optional()
                })
                .optional(),
            size: z.number().optional()
        })
    ),
    nextCursor: z.string().optional().describe('Pagination cursor to retrieve the next page of versions.')
});

const action = createAction({
    description: 'List the version history of a presentation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All', 'Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = input.cursor ? input.cursor : `v1.0/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/versions`;

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-list-versions
            endpoint,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const versions = (providerResponse.value || []).map((version) => ({
            id: version.id,
            ...(version.lastModifiedDateTime !== undefined && { lastModifiedDateTime: version.lastModifiedDateTime }),
            ...(version.lastModifiedBy !== undefined && { lastModifiedBy: version.lastModifiedBy }),
            ...(version.size !== undefined && { size: version.size })
        }));

        return {
            versions,
            ...(providerResponse['@odata.nextLink'] != null && { nextCursor: providerResponse['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
