import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email_id: z.string().describe('The email ID to clone. Example: "38175169118"'),
    clone_name: z.string().optional().describe('The name to assign to the cloned email. Example: "Cloned Newsletter"'),
    language: z.string().optional().describe('The language code for the cloned email, such as "en" for English. Example: "en"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    subject: z.union([z.string(), z.null()]),
    state: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()]),
    cloned_from: z.union([z.string(), z.null()]),
    is_published: z.union([z.boolean(), z.null()]),
    is_transactional: z.union([z.boolean(), z.null()]),
    type: z.union([z.string(), z.null()]),
    subcategory: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Clone an existing marketing email',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/clone-marketing-email',
        group: 'Marketing Emails'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['content'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.hubspot.com/docs/api-reference/marketing-marketing-emails-v3/marketing-emails/post-marketing-v3-emails-clone
            endpoint: '/marketing/v3/emails/clone',
            data: {
                id: input.email_id,
                ...(input.clone_name && { cloneName: input.clone_name }),
                ...(input.language && { language: input.language })
            },
            retries: 10
        });

        const email = response.data;

        return {
            id: email.id,
            name: email.name ?? null,
            subject: email.subject ?? null,
            state: email.state ?? null,
            created_at: email.createdAt ?? null,
            updated_at: email.updatedAt ?? null,
            cloned_from: email.clonedFrom ?? null,
            is_published: email.isPublished ?? null,
            is_transactional: email.isTransactional ?? null,
            type: email.type ?? null,
            subcategory: email.subcategory ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
