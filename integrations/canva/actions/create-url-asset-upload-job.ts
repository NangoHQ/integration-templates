import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    url: z
        .string()
        .min(1)
        .describe('The URL of the file to import. Must be publicly accessible and return HTTP 200 directly. Example: "https://example.com/image.jpg"'),
    name: z.string().min(1).describe('A name for the asset. Example: "My Awesome Asset"')
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

const AssetSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    created_at: z.number(),
    updated_at: z.number(),
    owner: TeamUserSummarySchema,
    thumbnail: ThumbnailSchema.optional()
});

const AssetUploadJobSchema = z.object({
    id: z.string(),
    status: z.string(),
    error: AssetUploadErrorSchema.optional(),
    asset: AssetSchema.optional()
});

const OutputSchema = z.object({
    job: AssetUploadJobSchema
});

const action = createAction({
    description: 'Start an asset upload job from a source URL.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/create-url-asset-upload-job', group: 'Assets' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asset:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://www.canva.dev/docs/connect/api-reference/assets/create-url-asset-upload-job/
            endpoint: '/rest/v1/url-asset-uploads',
            data: {
                url: input.url,
                name: input.name
            },
            retries: 10
        });

        const parsed = z.object({ job: AssetUploadJobSchema }).parse(response.data);

        return {
            job: parsed.job
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
