import { z } from 'zod';
import { createAction } from 'nango';

import { FundSchema, ProviderFundSchema, mapFund } from '../helpers/funds.js';

const InputSchema = z
    .object({
        fund_id: z.string().describe('Unique identifier of the fund to terminate. Example: "d8135cfe-0396-4b2d-b2cf-ad809fb04731"')
    })
    .describe('Input identifying the fund to permanently terminate.');

const OutputSchema = FundSchema.describe('The terminated fund, including any cards that were terminated with it.');

/**
 * @tags: [write, destructive]
 * @tagReason: Terminates (soft-deletes) a spend-limit fund and cascades termination to any cards issued against it, a difficult-to-reverse provider mutation.
 * @pitfalls: Termination is a soft delete, so the fund stays retrievable with state "TERMINATED" instead of being removed, and it cannot be undone; any cards issued against the fund are cascade-terminated and dropped from its card list, with their last_four/expiration redacted to "*REDACTED*".
 */
const action = createAction({
    description: 'Permanently terminate a fund (spend limit), including any cards issued against it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['funds:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.ramp.com/developer-api/v1/api/funds
            endpoint: `/developer/v1/funds/${encodeURIComponent(input.fund_id)}`,
            // Verified live: terminating an already-terminated fund returns 200 with state "TERMINATED", so retrying is safe.
            retries: 3
        });

        return mapFund(ProviderFundSchema.parse(response.data));
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
