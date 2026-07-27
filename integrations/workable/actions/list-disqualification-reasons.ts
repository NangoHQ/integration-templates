import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const DisqualificationReasonSchema = z.object({
    id: z.string(),
    description: z.string(),
    candidate_withdrew: z.boolean(),
    position: z.number()
});

const OutputSchema = z.array(DisqualificationReasonSchema);

const action = createAction({
    description: "List the account's configured disqualification reasons.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/list-disqualification-reasons
            endpoint: '/spi/v3/disqualification_reasons',
            retries: 3
        });

        const parsed = z.array(DisqualificationReasonSchema).parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
