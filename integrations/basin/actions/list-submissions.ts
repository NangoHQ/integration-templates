import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    form_id: z.number().int().positive().describe('Form ID. Example: 72983'),
    filter_by: z
        .enum(['new', 'spam', 'trash', 'all'])
        .optional()
        .describe("Filter submissions by status. Defaults to inbox-only if omitted. 'all' may not reliably include spam/trash items."),
    query: z.string().optional().describe('Search query string'),
    order_by: z.enum(['date_asc', 'date_desc', 'email_asc', 'email_desc']).optional().describe('Sort order for results'),
    date_range: z.string().optional().describe('Date range filter in YYYY-MM-DD+to+YYYY-MM-DD format'),
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const SubmissionSchema = z
    .object({
        id: z.number(),
        form_id: z.number().optional(),
        read: z.boolean().optional(),
        created_at: z.string().optional(),
        updated_at: z.string().optional(),
        email: z.string().optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
        attachments: z.array(z.record(z.string(), z.unknown())).optional()
    })
    .passthrough();

const MetaSchema = z.object({
    count: z.number(),
    inbox_count: z.number(),
    spam_count: z.number(),
    trash_count: z.number(),
    // Basin echoes back `page` as the same type it was sent as (a string, since it's a
    // query param) whenever a page is explicitly requested, instead of always a number.
    page: z.coerce.number(),
    per_page: z.number(),
    form_name: z.string()
});

const OutputSchema = z.object({
    submissions: z.array(SubmissionSchema),
    meta: MetaSchema,
    next_page: z.number().optional().describe('Next page number if more results are available')
});

const action = createAction({
    description: 'List submissions for a form',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            form_id: input.form_id
        };

        if (input.filter_by !== undefined) {
            params['filter_by'] = input.filter_by;
        }
        if (input.query !== undefined) {
            params['query'] = input.query;
        }
        if (input.order_by !== undefined) {
            params['order_by'] = input.order_by;
        }
        if (input.date_range !== undefined) {
            params['date_range'] = input.date_range;
        }
        if (input.cursor !== undefined) {
            const pageNum = Number(input.cursor);
            if (!Number.isInteger(pageNum) || pageNum < 1) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'cursor must be a positive integer page number.'
                });
            }
            params['page'] = pageNum;
        }

        const response = await nango.get({
            // https://docs.usebasin.com/developer-features/api-reference/
            endpoint: 'v1/submissions/',
            params,
            retries: 3
        });

        const providerResponse = z
            .object({
                submissions: z.array(z.unknown()),
                meta: z.unknown()
            })
            .parse(response.data);

        const submissions = providerResponse.submissions.map((item) => SubmissionSchema.parse(item));
        const meta = MetaSchema.parse(providerResponse.meta);

        const hasMorePages = meta.page * meta.per_page < meta.count;
        const nextPage = hasMorePages ? meta.page + 1 : undefined;

        return {
            submissions,
            meta,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
