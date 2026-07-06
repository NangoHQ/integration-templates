import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().optional().describe('Maximum number of accounts to return. Example: 10'),
    starting_after: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    search: z.string().optional().describe('Search term to filter accounts. Example: gmail.com'),
    status: z
        .number()
        .optional()
        .describe(
            'Filter by account status. 1 = Active, 2 = Paused, 3 = Temporarily paused, -1 = Connection Error, -2 = Soft Bounce Error, -3 = Sending Error.'
        ),
    include_tags: z.boolean().optional().describe('Include tags assigned to each account in the response.')
});

const TagSchema = z.object({
    id: z.string(),
    label: z.string(),
    description: z.string().nullable().optional()
});

const AccountSchema = z
    .object({
        email: z.string(),
        timestamp_created: z.string(),
        timestamp_updated: z.string(),
        first_name: z.string(),
        last_name: z.string(),
        organization: z.string(),
        warmup_status: z.number(),
        provider_code: z.number(),
        setup_pending: z.boolean(),
        is_managed_account: z.boolean(),
        status: z.number().optional(),
        daily_limit: z.number().nullable().optional(),
        tracking_domain_name: z.string().nullable().optional(),
        tracking_domain_status: z.string().nullable().optional(),
        stat_warmup_score: z.number().nullable().optional(),
        sending_gap: z.number().optional(),
        signature: z.string().nullable().optional(),
        reply_to: z.string().nullable().optional(),
        tags: z.array(TagSchema).nullable().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(AccountSchema),
    next_starting_after: z.string().optional()
});

const action = createAction({
    description: 'List email accounts',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-accounts',
        method: 'GET'
    },
    scopes: ['accounts:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.instantly.ai/api-reference/groups/account
            endpoint: '/v2/accounts',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.starting_after !== undefined && { starting_after: input.starting_after }),
                ...(input.search !== undefined && { search: input.search }),
                ...(input.status !== undefined && { status: String(input.status) }),
                ...(input.include_tags !== undefined && { include_tags: String(input.include_tags) })
            },
            retries: 3
        });

        const data = response.data;
        if (!data || typeof data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Instantly API'
            });
        }

        const parsedResponse = z
            .object({
                items: z.array(z.unknown()).default([]),
                next_starting_after: z.string().optional()
            })
            .parse(data);

        const items = parsedResponse.items.map((item) => {
            return AccountSchema.parse(item);
        });

        return {
            items,
            ...(parsedResponse.next_starting_after !== undefined && { next_starting_after: parsedResponse.next_starting_after })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
