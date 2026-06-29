import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    dubbing_id: z.string().describe('ID of the dubbing project. Example: "21m00Tcm4TlvDq8ikWAM"')
});

const DubbingMediaMetadataSchema = z.object({
    content_type: z.string(),
    duration: z.number()
});

const ProviderDubbingMetadataSchema = z.object({
    dubbing_id: z.string(),
    name: z.string(),
    status: z.string(),
    source_language: z.string().nullable(),
    target_languages: z.array(z.string()),
    editable: z.boolean().optional(),
    created_at: z.string(),
    media_metadata: DubbingMediaMetadataSchema.nullable().optional(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    dubbing_id: z.string(),
    name: z.string(),
    status: z.string(),
    source_language: z.string().optional(),
    target_languages: z.array(z.string()),
    editable: z.boolean().optional(),
    created_at: z.string(),
    media_metadata: DubbingMediaMetadataSchema.optional(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a dubbing project.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-dubbing-project'
    },
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://elevenlabs.io/docs/api-reference/dubbing/get
            endpoint: `/v1/dubbing/${encodeURIComponent(input.dubbing_id)}`,
            retries: 3
        });

        const providerData = ProviderDubbingMetadataSchema.parse(response.data);

        return {
            dubbing_id: providerData.dubbing_id,
            name: providerData.name,
            status: providerData.status,
            target_languages: providerData.target_languages,
            created_at: providerData.created_at,
            ...(providerData.source_language != null && { source_language: providerData.source_language }),
            ...(providerData.editable !== undefined && { editable: providerData.editable }),
            ...(providerData.media_metadata != null && { media_metadata: providerData.media_metadata }),
            ...(providerData.error != null && { error: providerData.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
