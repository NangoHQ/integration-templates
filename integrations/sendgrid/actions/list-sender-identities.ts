import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().regex(/^\d+$/).optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().positive().optional().describe('Maximum number of results to return.')
});

const SenderIdentitySchema = z.object({
    id: z.number(),
    nickname: z.string(),
    from_email: z.string(),
    from_name: z.string().optional(),
    reply_to: z.string().optional(),
    reply_to_name: z.string().optional(),
    address: z.string().optional(),
    address2: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    verified: z.boolean(),
    locked: z.boolean()
});

const OutputSchema = z.object({
    results: z.array(SenderIdentitySchema),
    next_cursor: z.string().optional()
});

const ProviderResponseSchema = z.object({
    results: z.array(SenderIdentitySchema)
});

const action = createAction({
    description: 'List verified sender identities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.twilio.com/docs/sendgrid/api-reference/sender-verification/get-all-verified-senders
        const response = await nango.get({
            endpoint: '/v3/verified_senders',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { lastSeenID: Number(input.cursor) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const rawResults = providerResponse.results;
        const verifiedResults = rawResults.filter((sender) => sender.verified);

        const lastResult = rawResults.at(-1);
        const nextCursor = input.limit !== undefined && rawResults.length === input.limit && lastResult !== undefined ? String(lastResult.id) : undefined;

        return {
            results: verifiedResults,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
