import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    item_id: z.string().describe('The item ID to create the update on. Example: "2933609588"'),
    body: z.string().describe('The update text. HTML formatting is supported.'),
    parent_id: z.string().optional().describe('The parent update ID to reply to. Omit for top-level updates.')
});

const ProviderCreateUpdateResponseSchema = z.object({
    data: z.object({
        create_update: z
            .object({
                id: z.string(),
                body: z.string().optional().nullable(),
                created_at: z.string().optional().nullable(),
                creator_id: z.string().optional().nullable(),
                item_id: z.string().optional().nullable(),
                text_body: z.string().optional().nullable(),
                updated_at: z.string().optional().nullable()
            })
            .nullable()
    }),
    errors: z.array(z.unknown()).optional(),
    account_id: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    body: z.string().optional(),
    created_at: z.string().optional(),
    creator_id: z.string().optional(),
    item_id: z.string().optional(),
    text_body: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Create a update in monday.com.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-update',
        group: 'Updates'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['updates:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation ($item_id: ID!, $body: String!, $parent_id: ID) {
                create_update(item_id: $item_id, body: $body, parent_id: $parent_id) {
                    id
                    body
                    created_at
                    creator_id
                    item_id
                    text_body
                    updated_at
                }
            }
        `;

        // https://developer.monday.com/api-reference/reference/updates#create-update
        const response = await nango.post({
            endpoint: '/v2',
            data: {
                query: query,
                variables: {
                    item_id: input.item_id,
                    body: input.body,
                    parent_id: input.parent_id ?? null
                }
            },
            headers: {
                'api-version': '2026-04'
            },
            retries: 3
        });

        const parsed = ProviderCreateUpdateResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Invalid response from monday.com API',
                details: parsed.error.format()
            });
        }

        if (parsed.data.errors && parsed.data.errors.length > 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'GraphQL error from monday.com API',
                errors: parsed.data.errors
            });
        }

        const update = parsed.data.data.create_update;
        if (!update) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'No update returned from monday.com API'
            });
        }

        return {
            id: update.id,
            ...(update.body != null && { body: update.body }),
            ...(update.created_at != null && { created_at: update.created_at }),
            ...(update.creator_id != null && { creator_id: update.creator_id }),
            ...(update.item_id != null && { item_id: update.item_id }),
            ...(update.text_body != null && { text_body: update.text_body }),
            ...(update.updated_at != null && { updated_at: update.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
