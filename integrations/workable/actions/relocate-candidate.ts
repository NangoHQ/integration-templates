import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Candidate ID to relocate. Example: "272737d8"'),
    member_id: z.string().describe('Member ID performing the relocation. Example: "1f395d"'),
    target_job_shortcode: z.string().describe('Shortcode of the target job. Example: "B3627BCF5D"'),
    target_stage: z.string().optional().describe('Stage slug for the target job (e.g. "interview"). Recommended; omitting may cause errors.')
});

const ProviderResponseSchema = z.object({
    candidate: z.object({
        id: z.string(),
        url: z.string()
    })
});

const OutputSchema = z.object({
    candidate: z.object({
        id: z.string(),
        url: z.string()
    })
});

const action = createAction({
    description: 'Move a candidate to another job, deleting the original candidate record.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates', 'w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: {
            member_id: string;
            target_job_shortcode: string;
            target_stage?: string;
        } = {
            member_id: input.member_id,
            target_job_shortcode: input.target_job_shortcode
        };

        if (input.target_stage !== undefined) {
            requestBody.target_stage = input.target_stage;
        }

        const response = await nango.post({
            // https://workable.readme.io/reference/relocate-candidate
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.id)}/relocate`,
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            candidate: {
                id: providerResponse.candidate.id,
                url: providerResponse.candidate.url
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
