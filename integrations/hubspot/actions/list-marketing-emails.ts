import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const MarketingEmailSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    subject: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    emails: z.array(MarketingEmailSchema),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'List marketing emails',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-marketing-emails',
        group: 'Marketing'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['content'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.hubspot.com/docs/api-reference/marketing-marketing-emails-v3/marketing-emails/get-marketing-v3-emails-
            endpoint: '/marketing/v3/emails',
            params: {
                limit: '100',
                ...(input.cursor && { after: input.cursor })
            },
            retries: 3
        });

        const emails =
            response.data.results?.map((email: any) => ({
                id: email.id,
                name: email.name ?? null,
                subject: email.subject ?? null,
                created_at: email.createdAt ?? null,
                updated_at: email.updatedAt ?? null,
                type: email.type ?? null,
                state: email.state ?? null
            })) || [];

        return {
            emails,
            next_cursor: response.data.paging?.next?.after || null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
