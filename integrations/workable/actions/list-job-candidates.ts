import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    shortcode: z.string().describe('Job shortcode. Example: "9CD658E13E"'),
    cursor: z.string().optional().describe('Pagination cursor (full next URL) from a previous response. Omit for the first page.'),
    limit: z.number().min(1).max(100).optional().describe('Number of results per page. Max 100.')
});

const CandidateSchema = z
    .object({
        id: z.string(),
        name: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(CandidateSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List candidates for a specific job',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_candidates'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let params: Record<string, string | number>;
        if (input.cursor) {
            const cursorUrl = new URL(input.cursor);
            params = {};
            cursorUrl.searchParams.forEach((value, key) => {
                params[key] = value;
            });
            // Workable's paging.next sometimes uses the legacy nested route /jobs/{shortcode}/candidates
            // instead of the filter-based /candidates?shortcode={shortcode}. Extract shortcode from the path when needed.
            const legacyMatch = cursorUrl.pathname.match(/\/jobs\/([^/]+)\/candidates$/);
            if (legacyMatch && legacyMatch[1]) {
                params['shortcode'] = legacyMatch[1];
            }
        } else {
            params = {
                shortcode: input.shortcode
            };
            if (input.limit !== undefined) {
                params['limit'] = input.limit;
            }
        }

        const response = await nango.get({
            // https://workable.readme.io/reference/list-candidates
            endpoint: '/spi/v3/candidates',
            params,
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            candidates: z.array(z.unknown()),
            paging: z
                .object({
                    next: z.string().optional().nullable()
                })
                .optional()
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            items: parsed.candidates.map((item) => CandidateSchema.parse(item)),
            ...(parsed.paging?.next != null && { next_cursor: parsed.paging.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
