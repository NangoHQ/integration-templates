import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.')
});

const MarketingEmailSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    subject: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    type: z.string().optional(),
    state: z.string().optional()
});

const OutputSchema = z.object({
    emails: z.array(MarketingEmailSchema),
    nextCursor: z.string().optional()
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
                name: email.name ?? undefined,
                subject: email.subject ?? undefined,
                createdAt: email.createdAt ?? undefined,
                updatedAt: email.updatedAt ?? undefined,
                type: email.type ?? undefined,
                state: email.state ?? undefined
            })) || [];

        return {
            emails,
            nextCursor: response.data.paging?.next?.after || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
