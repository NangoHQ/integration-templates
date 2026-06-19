import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    file_base64: z
        .string()
        .describe(
            'Base64-encoded file bytes to upload. Example: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="'
        ),
    name: z.string().describe('The asset name. Maximum 50 characters. Example: "My Awesome Upload"')
});

const AssetUploadErrorSchema = z.object({
    code: z.string(),
    message: z.string()
});

const AssetSchema = z.object({
    type: z.enum(['image', 'video']),
    id: z.string(),
    name: z.string(),
    tags: z.array(z.string()),
    owner: z.object({
        user_id: z.string(),
        team_id: z.string()
    }),
    created_at: z.number(),
    updated_at: z.number(),
    thumbnail: z
        .object({
            width: z.number(),
            height: z.number(),
            url: z.string()
        })
        .optional(),
    metadata: z.record(z.string(), z.unknown()).optional()
});

const JobSchema = z.object({
    id: z.string(),
    status: z.enum(['failed', 'in_progress', 'success']),
    error: AssetUploadErrorSchema.optional(),
    asset: AssetSchema.optional()
});

const OutputSchema = z.object({
    job: JobSchema
});

const action = createAction({
    description: 'Start an asset upload job from raw bytes.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['asset:write'],
    endpoint: {
        path: '/actions/create-asset-upload-job',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const fileBuffer = Buffer.from(input.file_base64, 'base64');
        const nameBase64 = Buffer.from(input.name).toString('base64');

        const response = await nango.post({
            // https://www.canva.dev/docs/connect/api-reference/assets/create-asset-upload-job/
            endpoint: '/rest/v1/asset-uploads',
            data: fileBuffer,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Asset-Upload-Metadata': JSON.stringify({ name_base64: nameBase64 })
            },
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
