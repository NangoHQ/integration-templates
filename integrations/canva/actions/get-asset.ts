import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    assetId: z.string().describe('The ID of the asset. Example: "MAHNAIYJM-w"')
});

const ImageMetadataSchema = z.object({
    type: z.literal('image'),
    width: z.number().optional(),
    height: z.number().optional(),
    smart_tags: z.array(z.string()).optional()
});

const VideoMetadataSchema = z.object({
    type: z.literal('video'),
    width: z.number(),
    height: z.number(),
    duration: z.number().optional()
});

const MetadataSchema = z.union([ImageMetadataSchema, VideoMetadataSchema]);

const OutputSchema = z.object({
    id: z.string(),
    type: z.enum(['image', 'video']),
    name: z.string(),
    tags: z.array(z.string()),
    created_at: z.number(),
    updated_at: z.number(),
    owner: z.object({
        user_id: z.string(),
        team_id: z.string()
    }),
    thumbnail: z
        .object({
            width: z.number(),
            height: z.number(),
            url: z.string()
        })
        .optional(),
    metadata: MetadataSchema.optional()
});

const ProviderGetAssetResponseSchema = z.object({
    asset: z.object({
        type: z.enum(['image', 'video']),
        id: z.string(),
        name: z.string(),
        tags: z.array(z.string()),
        import_status: z
            .object({
                state: z.enum(['failed', 'in_progress', 'success']),
                error: z
                    .object({
                        code: z.enum(['file_too_big', 'import_failed']),
                        message: z.string()
                    })
                    .optional()
            })
            .optional(),
        created_at: z.number(),
        updated_at: z.number(),
        owner: z.object({
            user_id: z.string(),
            team_id: z.string()
        }),
        thumbnail: z
            .object({
                width: z.number(),
                height: z.number(),
                url: z.string()
            })
            .optional(),
        metadata: MetadataSchema.optional()
    })
});

const action = createAction({
    description: 'Retrieve asset metadata.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-asset' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asset:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/assets/
            endpoint: `/rest/v1/assets/${encodeURIComponent(input.assetId)}`,
            retries: 3
        });

        const providerResponse = ProviderGetAssetResponseSchema.parse(response.data);
        const asset = providerResponse.asset;

        return {
            id: asset.id,
            type: asset.type,
            name: asset.name,
            tags: asset.tags,
            created_at: asset.created_at,
            updated_at: asset.updated_at,
            owner: asset.owner,
            ...(asset.thumbnail !== undefined && { thumbnail: asset.thumbnail }),
            ...(asset.metadata !== undefined && { metadata: asset.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
