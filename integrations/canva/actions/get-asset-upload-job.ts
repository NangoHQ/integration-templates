import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    jobId: z.string().describe('The asset upload job ID. Example: "e08861ae-3b29-45db-8dc1-1fe0bf7f1cc8"')
});

const AssetUploadErrorSchema = z.object({
    code: z.string(),
    message: z.string()
});

const TeamUserSummarySchema = z.object({
    user_id: z.string(),
    team_id: z.string()
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
    type: z.enum(['image', 'video']),
    id: z.string(),
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
    status: z.enum(['failed', 'in_progress', 'success']),
    error: AssetUploadErrorSchema.optional(),
    asset: AssetSchema.optional()
});

const OutputSchema = z.object({
    job: AssetUploadJobSchema
});

const ProviderResponseSchema = z.object({
    job: AssetUploadJobSchema
});

const action = createAction({
    description: 'Retrieve asset upload job status/result.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asset:write'],
    endpoint: {
        path: '/actions/get-asset-upload-job',
        method: 'GET'
    },

    exec: async (nango, input) => {
        const response = await nango.get({
            // https://www.canva.dev/docs/connect/api-reference/assets/get-asset-upload-job/
            endpoint: `/rest/v1/asset-uploads/${encodeURIComponent(input.jobId)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            job: providerResponse.job
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
