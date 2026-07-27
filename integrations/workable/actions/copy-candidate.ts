import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Candidate ID to copy. Example: "272731c3"'),
    member_id: z.string().describe('Member ID performing the copy. Example: "1f395d"'),
    target_job_shortcode: z.string().describe('Shortcode of the target job. Example: "B3627BCF5D"'),
    target_stage: z.string().describe('Stage slug for the copied candidate. Example: "sourced"')
});

const ProviderResponseSchema = z.object({
    candidate: z.object({
        id: z.string(),
        url: z.string().optional()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    url: z.string().optional()
});

const action = createAction({
    description: 'Copy a candidate into another job, leaving the original untouched.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates', 'w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://workable.readme.io/reference/copy-candidate
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.id)}/copy`,
            data: {
                member_id: input.member_id,
                target_job_shortcode: input.target_job_shortcode,
                target_stage: input.target_stage
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.candidate.id,
            ...(providerResponse.candidate.url !== undefined && { url: providerResponse.candidate.url })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
