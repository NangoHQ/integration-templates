import { z } from 'zod';
import { createAction } from 'nango';

const ThumbnailSizeSchema = z.object({
    height: z.number().optional(),
    width: z.number().optional(),
    url: z.string()
});

const ThumbnailSetSchema = z.object({
    id: z.string(),
    large: ThumbnailSizeSchema.optional(),
    medium: ThumbnailSizeSchema.optional(),
    small: ThumbnailSizeSchema.optional()
});

const ProviderResponseSchema = z.object({
    value: z.array(ThumbnailSetSchema)
});

const InputSchema = z.object({
    driveId: z.string().describe('Drive ID. Example: "b!abc123"'),
    itemId: z.string().describe('Item ID of the presentation. Example: "01RFYLAY..."')
});

const OutputSchema = z.object({
    thumbnails: z.array(
        z.object({
            id: z.string(),
            smallUrl: z.string().optional(),
            mediumUrl: z.string().optional(),
            largeUrl: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Get thumbnail image URLs for a presentation.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Files.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedDriveId = encodeURIComponent(input.driveId);
        const encodedItemId = encodeURIComponent(input.itemId);

        const response = await nango.get({
            // https://learn.microsoft.com/en-us/graph/api/driveitem-list-thumbnails
            endpoint: `/v1.0/drives/${encodedDriveId}/items/${encodedItemId}/thumbnails`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        const thumbnails = providerData.value.map((set) => ({
            id: set.id,
            ...(set.small != null && { smallUrl: set.small.url }),
            ...(set.medium != null && { mediumUrl: set.medium.url }),
            ...(set.large != null && { largeUrl: set.large.url })
        }));

        return { thumbnails };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
