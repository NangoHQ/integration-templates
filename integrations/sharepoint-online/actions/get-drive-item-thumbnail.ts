import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    siteId: z.string().describe('SharePoint site ID. Example: "contoso.sharepoint.com,siteId,webId"'),
    driveId: z.string().describe('Drive ID. Example: "b!driveId"'),
    itemId: z.string().describe('Drive item ID. Example: "01NKDM7HMOJTVYMDOSXFDK2QJDXCDI3WUK"')
});

const ThumbnailSchema = z.object({
    height: z.number().optional(),
    width: z.number().optional(),
    url: z.string().optional()
});

const ThumbnailSetSchema = z.object({
    id: z.string(),
    small: ThumbnailSchema.optional(),
    medium: ThumbnailSchema.optional(),
    large: ThumbnailSchema.optional()
});

const OutputSchema = z.object({
    thumbnailSets: z.array(ThumbnailSetSchema)
});

const action = createAction({
    description: 'Retrieve thumbnail URLs for a drive item.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-drive-item-thumbnail',
        group: 'Drive Items'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Sites.Read.All', 'Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/driveitem-list-thumbnails
        const response = await nango.get({
            endpoint: `/v1.0/sites/${encodeURIComponent(input.siteId)}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.itemId)}/thumbnails`,
            retries: 3
        });

        const providerSchema = z.object({
            value: z.array(
                z.object({
                    id: z.string(),
                    small: ThumbnailSchema.optional(),
                    medium: ThumbnailSchema.optional(),
                    large: ThumbnailSchema.optional()
                })
            )
        });

        const parsed = providerSchema.parse(response.data);

        return {
            thumbnailSets: parsed.value.map((set) => ({
                id: set.id,
                ...(set.small !== undefined && { small: set.small }),
                ...(set.medium !== undefined && { medium: set.medium }),
                ...(set.large !== undefined && { large: set.large })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
