import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    emailId: z.string().describe('The ID of the marketing email to retrieve. Example: "38175169118"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    subject: z.string().optional(),
    state: z.string().optional(),
    type: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    publishedAt: z.string().optional(),
    isPublished: z.boolean().optional(),
    isTransactional: z.boolean().optional(),
    archived: z.boolean().optional()
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
            endpoint: `/marketing/v3/emails/${input.emailId}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Marketing email not found',
                emailId: input.emailId
            });
        }

        const data = response.data;

        return {
            id: data.id,
            name: data.name ?? undefined,
            subject: data.subject ?? undefined,
            state: data.state ?? undefined,
            type: data.type ?? undefined,
            createdAt: data.createdAt ?? undefined,
            updatedAt: data.updatedAt ?? undefined,
            publishedAt: data.publishedAt ?? undefined,
            isPublished: data.isPublished ?? undefined,
            isTransactional: data.isTransactional ?? undefined,
            archived: data.archived ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
