import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    shortcode: z
        .string()
        .optional()
        .describe("The job's shortcode. If provided only recruiters collaborating on the correlated job will be returned. Example: '9CD658E13E'"),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (the full URL in paging.next). Omit for the first page.'),
    limit: z.number().optional().describe('Number of results per page. Max 100.')
});

const RecruiterSchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string()
});

const ProviderResponseSchema = z.object({
    recruiters: z.array(z.unknown()).optional(),
    paging: z
        .object({
            next: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(RecruiterSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List external recruiters on the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let endpoint = '/spi/v3/recruiters';
        const params: Record<string, string | number> = {};

        if (input.shortcode !== undefined) {
            params['shortcode'] = input.shortcode;
        }

        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }

        if (input.cursor !== undefined) {
            if (input.cursor.startsWith('http')) {
                const parsed = new URL(input.cursor);
                endpoint = parsed.pathname;
                for (const [key, value] of parsed.searchParams) {
                    params[key] = value;
                }
            } else {
                params['cursor'] = input.cursor;
            }
        }

        const response = await nango.get({
            // https://workable.readme.io/reference/recruiters
            endpoint,
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = (providerResponse.recruiters || []).map((raw: unknown) => {
            const recruiter = RecruiterSchema.parse(raw);
            return {
                id: recruiter.id,
                name: recruiter.name,
                email: recruiter.email
            };
        });

        return {
            items,
            ...(providerResponse.paging?.next != null && { next_cursor: providerResponse.paging.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
