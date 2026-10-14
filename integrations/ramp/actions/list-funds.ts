import { z } from 'zod';
import { createAction } from 'nango';

import { FundSchema, ProviderFundSchema, mapFund } from '../helpers/funds.js';

const InputSchema = z
    .object({
        cursor: z
            .string()
            .url()
            .optional()
            .describe('Opaque cursor returned as next_cursor by a previous call. When provided, all other filters are ignored and the cursor page is fetched.'),
        page_size: z.number().int().min(2).max(100).optional().describe('Number of funds to return per page, between 2 and 100. Defaults to 20.'),
        display_name: z.string().optional().describe('Filter by fund display name'),
        entity_id: z.string().optional().describe('Filter by associated business entity ID'),
        is_terminated: z
            .boolean()
            .optional()
            .describe('When true, return only terminated funds; when false, exclude terminated funds. Omit to include funds in every state.')
    })
    .describe('Filters and pagination options for listing Ramp funds (spend limits).');

const OutputSchema = z
    .object({
        items: z.array(FundSchema).describe('Funds returned for this page'),
        next_cursor: z.string().optional().describe('Opaque cursor to pass as input.cursor to fetch the next page; omitted when there are no more results')
    })
    .describe('A page of Ramp funds (spend limits) plus an optional cursor for the next page.');

const ProviderResponseSchema = z.object({
    data: z.array(ProviderFundSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

/**
 * @tags: [read]
 * @tagReason: Reads the list of funds from Ramp; no provider state is modified.
 * @pitfalls: Amounts are integers in the smallest currency unit (cents for USD); divide by minor_unit_conversion_rate for the real value. Terminated funds are returned by default unless is_terminated is set. Card last_four and expiration are redacted to "*REDACTED*" for inactive cards. Passing a cursor ignores any other filters, so re-supply filters only when starting a new query.
 */
const action = createAction({
    description:
        'List funds - Ramp\'s current API name for what the product UI still calls "spend limits" - each a card-attached spending limit with its own balance and restrictions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['funds:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[] | number[]> = {};

        if (input.cursor !== undefined) {
            const cursorUrl = new URL(input.cursor);
            cursorUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
        } else {
            if (input.page_size !== undefined) {
                params['page_size'] = input.page_size;
            }
            if (input.display_name !== undefined) {
                params['display_name'] = input.display_name;
            }
            if (input.entity_id !== undefined) {
                params['entity_id'] = input.entity_id;
            }
            if (input.is_terminated !== undefined) {
                params['is_terminated'] = String(input.is_terminated);
            }
        }

        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api-reference/funds/get-fund-list (Ramp Developer API - List funds)
            endpoint: '/developer/v1/funds',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.data.map(mapFund),
            ...(parsed.page.next != null && { next_cursor: parsed.page.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
