import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email_id: z.string().describe('The ID of the marketing email to retrieve. Example: "38175169118"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    subject: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()]),
    type: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()]),
    published_at: z.union([z.string(), z.null()]),
    is_published: z.union([z.boolean(), z.null()]),
    is_transactional: z.union([z.boolean(), z.null()]),
    archived: z.union([z.boolean(), z.null()])
});

const action = createAction({
    description: 'Get a marketing email by ID',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-marketing-email',
        group: 'Marketing'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['content'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/marketing-marketing-emails-v3/marketing-emails/get-marketing-v3-emails-emailId
        const response = await nango.get({
            endpoint: `/marketing/v3/emails/${input.email_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Marketing email not found',
                email_id: input.email_id
            });
        }

        const data = response.data;

        return {
            id: data.id,
            name: data.name ?? null,
            subject: data.subject ?? null,
            state: data.state ?? null,
            type: data.type ?? null,
            created_at: data.createdAt ?? null,
            updated_at: data.updatedAt ?? null,
            published_at: data.publishedAt ?? null,
            is_published: data.isPublished ?? null,
            is_transactional: data.isTransactional ?? null,
            archived: data.archived ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
