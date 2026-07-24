import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Candidate ID. Example: "272737d8"'),
    member_id: z.string().describe('The ID of the member performing the disqualification. Example: "1f395d"'),
    disqualify_reason_id: z.string().optional().describe('Disqualification reason ID from list-disqualification-reasons. Example: "b29c63"'),
    disqualify_note: z.string().max(256).optional().describe('Optional note explaining the disqualification. Max 256 characters.'),
    withdrew: z.boolean().optional().describe('If true, marks the candidate as withdrawn rather than rejected.')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Disqualify (or mark withdrawn) a candidate.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        await nango.post({
            // https://workable.readme.io/reference/disqualify-candidate
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.id)}/disqualify`,
            data: {
                member_id: input.member_id,
                ...(input.disqualify_reason_id !== undefined && { disqualify_reason_id: input.disqualify_reason_id }),
                ...(input.disqualify_note !== undefined && { disqualify_note: input.disqualify_note }),
                ...(input.withdrew !== undefined && { withdrew: input.withdrew })
            },
            retries: 3
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
