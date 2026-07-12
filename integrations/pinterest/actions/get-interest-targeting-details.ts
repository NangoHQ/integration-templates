import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    interest_id: z.string().regex(/^\d+$/).describe('Interest ID. Example: "935541271955"')
});

const ProviderInterestSchema = z.object({
    id: z.string(),
    name: z.string(),
    level: z.number(),
    child_interests: z.array(z.string())
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    level: z.number(),
    child_interests: z.array(z.string())
});

const action = createAction({
    description: 'Get details for a specific interest-targeting option.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ads:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.pinterest.com/docs/api/v5/#operation/interest_targeting_options/get
            endpoint: `/v5/resources/targeting/interests/${encodeURIComponent(input.interest_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Interest not found',
                interest_id: input.interest_id
            });
        }

        const providerInterest = ProviderInterestSchema.parse(response.data);

        return {
            id: providerInterest.id,
            name: providerInterest.name,
            level: providerInterest.level,
            child_interests: providerInterest.child_interests
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
