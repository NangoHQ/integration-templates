import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    assetId: z.string().describe('The ID of the asset to update. Example: "MAHNAIYJM-w"'),
    name: z.string().max(50).optional().describe('The new name for the asset.'),
    tags: z.array(z.string().max(50)).max(50).optional().describe('The replacement tags for the asset.')
});

const ProviderAssetSchema = z.object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    type: z.enum(['image', 'video']),
    created_at: z.number(),
    updated_at: z.number(),
    owner: z.object({
        user_id: z.string(),
        team_id: z.string()
    }),
    import_status: z
        .object({
            state: z.string().optional()
        })
        .optional(),
    thumbnail: z
        .object({
            width: z.number(),
            height: z.number(),
            url: z.string()
        })
        .optional(),
    metadata: z
        .object({
            type: z.string(),
            width: z.number().optional(),
            height: z.number().optional(),
            duration: z.number().optional(),
            smart_tags: z.array(z.string()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    type: z.enum(['image', 'video']),
    created_at: z.number(),
    updated_at: z.number(),
    owner: z.object({
        user_id: z.string(),
        team_id: z.string()
    }),
    import_status: z
        .object({
            state: z.string().optional()
        })
        .optional(),
    thumbnail: z
        .object({
            width: z.number(),
            height: z.number(),
            url: z.string()
        })
        .optional(),
    metadata: z
        .object({
            type: z.string(),
            width: z.number().optional(),
            height: z.number().optional(),
            duration: z.number().optional(),
            smart_tags: z.array(z.string()).optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update asset name and tags.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asset:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { name?: string; tags?: string[] } = {};

        if (input.name !== undefined) {
            requestBody.name = input.name;
        }

        if (input.tags !== undefined) {
            requestBody.tags = input.tags;
        }

        const response = await nango.patch({
            // https://www.canva.dev/docs/connect/api-reference/assets/update-asset/
            endpoint: `/rest/v1/assets/${encodeURIComponent(input.assetId)}`,
            data: requestBody,
            retries: 3
        });

        const raw = response.data;
        if (!raw || typeof raw !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Canva API.'
            });
        }

        const parsed = z.object({ asset: ProviderAssetSchema }).parse(raw);
        const asset = parsed.asset;

        return {
            id: asset.id,
            name: asset.name,
            tags: asset.tags,
            type: asset.type,
            created_at: asset.created_at,
            updated_at: asset.updated_at,
            owner: asset.owner,
            ...(asset.import_status !== undefined && { import_status: asset.import_status }),
            ...(asset.thumbnail !== undefined && { thumbnail: asset.thumbnail }),
            ...(asset.metadata !== undefined && { metadata: asset.metadata })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
