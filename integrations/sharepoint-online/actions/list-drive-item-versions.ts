import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    site_id: z
        .string()
        .describe('SharePoint site ID. Example: "contoso.sharepoint.com,1dabc234-5678-90ab-cdef-1234567890ab,1dabc234-5678-90ab-cdef-1234567890ab"'),
    drive_id: z.string().describe('Drive ID. Example: "b!isEncodedDriveId"'),
    item_id: z.string().describe('Drive item ID. Example: "01A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T1U2V3W4X5Y6Z"'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const LastModifiedByUserSchema = z
    .object({
        displayName: z.string().optional(),
        email: z.string().optional()
    })
    .optional();

const LastModifiedBySchema = z
    .object({
        user: LastModifiedByUserSchema
    })
    .optional();

const ProviderVersionSchema = z.object({
    id: z.string().optional(),
    size: z.number().optional(),
    lastModifiedDateTime: z.string().optional(),
    lastModifiedBy: LastModifiedBySchema
});

const ProviderResponseSchema = z.object({
    value: z.array(ProviderVersionSchema),
    '@odata.nextLink': z.string().optional()
});

const DriveItemVersionSchema = z.object({
    id: z.string(),
    size: z.number().optional(),
    lastModifiedDateTime: z.string().optional(),
    lastModifiedBy: LastModifiedBySchema.optional()
});

const OutputSchema = z.object({
    items: z.array(DriveItemVersionSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List the version history of a drive item.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/list-drive-item-versions',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://learn.microsoft.com/graph/api/driveitem-list-versions
            endpoint: `/v1.0/sites/${encodeURIComponent(input.site_id)}/drives/${encodeURIComponent(input.drive_id)}/items/${encodeURIComponent(input.item_id)}/versions`,
            params: {
                ...(input.cursor !== undefined && { $skiptoken: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.value.map((version) => {
            const lastModifiedBy =
                version.lastModifiedBy != null
                    ? {
                          ...(version.lastModifiedBy.user != null && {
                              user: {
                                  ...(version.lastModifiedBy.user.displayName != null && { displayName: version.lastModifiedBy.user.displayName }),
                                  ...(version.lastModifiedBy.user.email != null && { email: version.lastModifiedBy.user.email })
                              }
                          })
                      }
                    : undefined;

            return {
                id: version.id ?? '',
                ...(version.size != null && { size: version.size }),
                ...(version.lastModifiedDateTime != null && { lastModifiedDateTime: version.lastModifiedDateTime }),
                ...(lastModifiedBy !== undefined && { lastModifiedBy })
            };
        });

        let next_cursor: string | undefined;
        if (parsed['@odata.nextLink'] != null) {
            const url = new URL(parsed['@odata.nextLink']);
            const skiptoken = url.searchParams.get('$skiptoken');
            if (skiptoken != null) {
                next_cursor = skiptoken;
            }
        }

        return {
            items,
            ...(next_cursor != null && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
