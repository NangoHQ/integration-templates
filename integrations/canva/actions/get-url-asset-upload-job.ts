import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    job_id: z.string().describe('The asset upload job ID. Example: "e08861ae-3b29-45db-8dc1-1fe0bf7f1cc8"')
});

const AssetUploadErrorSchema = z.object({
    code: z.enum(['file_too_big', 'import_failed', 'fetch_failed']),
    message: z.string()
});

const TeamUserSummarySchema = z.object({
    user_id: z.string().optional(),
    team_id: z.string().optional()
});

const ThumbnailSchema = z.object({
    width: z.number(),
    height: z.number(),
    url: z.string()
});

const ImageMetadataSchema = z.object({
    type: z.literal('image'),
    width: z.number().optional(),
    height: z.number().optional(),
    smart_tags: z.array(z.string()).optional()
});

const VideoMetadataSchema = z.object({
    type: z.literal('video'),
    width: z.number().optional(),
    height: z.number().optional(),
    duration: z.number().optional()
});

const AssetMetadataSchema = z.union([ImageMetadataSchema, VideoMetadataSchema]);

const AssetSchema = z.object({
    id: z.string(),
    type: z.enum(['image', 'video']),
    name: z.string(),
    tags: z.array(z.string()),
    created_at: z.number(),
    updated_at: z.number(),
    owner: TeamUserSummarySchema,
    thumbnail: ThumbnailSchema.optional(),
    metadata: AssetMetadataSchema.optional()
});

const AssetUploadJobSchema = z.object({
    id: z.string(),
    status: z.enum(['in_progress', 'success', 'failed']),
    error: AssetUploadErrorSchema.optional(),
    asset: AssetSchema.optional()
});

const ProviderResponseSchema = z.object({
    job: AssetUploadJobSchema
});

const OutputSchema = z.object({
    id: z.string(),
    status: z.enum(['in_progress', 'success', 'failed']),
    error: AssetUploadErrorSchema.optional(),
    asset: AssetSchema.optional()
});

const action = createAction({
    description: 'Retrieve URL asset upload job status and result.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asset:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/assets/get-url-asset-upload-job/
            endpoint: `/rest/v1/url-asset-uploads/${encodeURIComponent(input.job_id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.job.id,
            status: providerResponse.job.status,
            ...(providerResponse.job.error !== undefined && {
                error: providerResponse.job.error
            }),
            ...(providerResponse.job.asset !== undefined && {
                asset: providerResponse.job.asset
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
