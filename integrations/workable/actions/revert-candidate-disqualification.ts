import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    candidate_id: z.string().describe('Candidate ID to revert disqualification for. Example: "272780b9"'),
    member_id: z.string().describe('Member ID performing the revert. Example: "1f395d"')
});

const OutputSchema = z.object({});

const action = createAction({
    description: 'Undo a candidate disqualification, restoring them to their prior stage.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates', 'w_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://workable.readme.io/reference/revert-candidate-disqualification
        await nango.post({
            endpoint: `/spi/v3/candidates/${encodeURIComponent(input.candidate_id)}/revert`,
            data: {
                member_id: input.member_id
            },
            retries: 3
        });

        return {};
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
