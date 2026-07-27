import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    candidate_id: z.string().describe('Candidate ID. Example: "27273038"')
});

const ProviderFileSchema = z.object({
    name: z.string(),
    preview_url: z.string(),
    source: z.string(),
    kind: z.string().optional()
});

const ProviderResponseSchema = z.object({
    files: z.array(ProviderFileSchema).optional()
});

const OutputSchema = z.object({
    files: z.array(
        z.object({
            name: z.string(),
            preview_url: z.string().describe('Pre-signed S3 URL that expires in ~16h40m (60,000s). Do not cache long-term; re-fetch when needed.'),
            source: z.string(),
            kind: z.string().optional()
        })
    )
});

const action = createAction({
    description: "List files attached to a candidate's profile (resume, attachments).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/candidate-files.md
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.candidate_id)}/files`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            files: parsed.files ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
