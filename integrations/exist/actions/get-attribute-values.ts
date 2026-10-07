import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        attribute: z.string().describe('Name of the attribute whose full value history to fetch. Example: "steps".'),
        page: z.number().int().positive().optional().describe('Page index to fetch (1-based). Optional; the provider defaults to its first page.'),
        limit: z.number().int().positive().max(100).optional().describe('Number of values to return per page. Optional, maximum 100.'),
        date_max: z.string().optional().describe('Most recent date (inclusive) of results to return, in YYYY-mm-dd format. Optional.')
    })
    .describe('Input for fetching one attribute value history page.');

const AttributeValueSchema = z.object({
    date: z.string().describe('Date the value applies to, in YYYY-mm-dd format.'),
    value: z
        .union([z.number(), z.string()])
        .nullable()
        .describe('Recorded value for the date; a number or string depending on the attribute type, or null when no value is recorded.')
});

const OutputSchema = z
    .object({
        count: z.number().describe('Total number of values recorded for the attribute across all pages.'),
        next: z.string().nullable().describe('URL of the next page of results, or null when this is the last page.'),
        previous: z.string().nullable().describe('URL of the previous page of results, or null when this is the first page.'),
        results: z.array(AttributeValueSchema).describe('Value history entries for the requested attribute, most recent first.')
    })
    .describe('One page of an attribute value history, with links to adjacent pages.');

const ProviderValuesSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(AttributeValueSchema)
});

function isNotFoundError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
        return false;
    }
    if ('response' in error) {
        const response = error.response;
        if (typeof response === 'object' && response !== null && 'status' in response) {
            return response.status === 404;
        }
    }
    if ('status' in error) {
        return error.status === 404;
    }
    return false;
}

/**
 * @tags: [read]
 * @tagReason: Fetches an attribute's recorded value history without modifying any provider data.
 * @pitfalls: A 404 means the attribute is currently inactive/unowned, not empty - its data still exists and re-acquiring the attribute restores it; results can include an auto-seeded row for today with a default (often null) value even when nothing was explicitly recorded; only date_max filters results, and date_min has no effect.
 */
const action = createAction({
    description: 'Get the full paged value history for one specific attribute.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            attribute: input.attribute
        };
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.date_max !== undefined) {
            params['date_max'] = input.date_max;
        }

        let payload: unknown;
        // @allowTryCatch: a released/unowned attribute returns 404 even though its data still exists; convert that into a meaningful ActionError.
        try {
            const response = await nango.get({
                // https://developer.exist.io/reference/attributes/#get-a-specific-attribute
                endpoint: '/api/2/attributes/values/',
                params,
                retries: 3
            });
            payload = response.data;
        } catch (error) {
            if (isNotFoundError(error)) {
                throw new nango.ActionError({
                    type: 'attribute_not_accessible',
                    message: `Attribute "${input.attribute}" is not currently accessible. It may be inactive or owned by another service; re-acquire it to restore access to its existing history.`,
                    attribute: input.attribute
                });
            }
            throw error;
        }

        const providerValues = ProviderValuesSchema.parse(payload);

        return {
            count: providerValues.count,
            next: providerValues.next,
            previous: providerValues.previous,
            results: providerValues.results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
