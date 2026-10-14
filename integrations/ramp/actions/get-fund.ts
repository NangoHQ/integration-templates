import { z } from 'zod';
import { createAction } from 'nango';

import { FundSchema, ProviderFundSchema, mapFund } from '../helpers/funds.js';

const InputSchema = z
    .object({
        fund_id: z.string().describe('Unique identifier of the fund to retrieve. Example: "325a12bc-75c4-4022-8855-8e0dba170103"')
    })
    .describe('Input for retrieving a single Ramp fund by ID.');

const OutputSchema = FundSchema.describe('A Ramp fund, including its balance, spending restrictions, members, and linked cards.');

function isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return false;
    }
    const response = error.response;
    return typeof response === 'object' && response !== null && 'status' in response && response.status === 404;
}

/**
 * @tags: [read]
 * @tagReason: Retrieves a single fund by ID; read-only with no provider mutation.
 * @pitfalls: A terminated or archived fund still returns a successful response with a non-ACTIVE `state`, so callers must inspect `state` rather than assume the fund is usable; an unknown fund ID fails with a `not_found` ActionError instead of an empty result.
 */
const action = createAction({
    description: 'Retrieve a single fund by ID.',
    version: '1.0.0',
    scopes: ['funds:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch - convert a provider 404 into a clear, typed not-found error instead of a raw HTTP failure.
        try {
            const response = await nango.get({
                // https://docs.ramp.com/developer-api/v1/api-reference/funds/get-fund
                endpoint: `/developer/v1/funds/${encodeURIComponent(input.fund_id)}`,
                retries: 3
            });

            return mapFund(ProviderFundSchema.parse(response.data));
        } catch (error) {
            if (isNotFoundError(error)) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: `Fund ${input.fund_id} was not found.`
                });
            }

            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
