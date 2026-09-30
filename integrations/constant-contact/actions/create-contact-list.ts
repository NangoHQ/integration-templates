import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        name: z.string().describe('Name of the contact list. Must be unique within the account. Example: "Newsletter Subscribers"'),
        description: z.string().optional().describe('Optional description of the contact list. Example: "People who signed up for the monthly newsletter"'),
        favorite: z.boolean().optional().describe('Whether to mark the contact list as a favorite in the account. Defaults to false.')
    })
    .describe('Input for creating a new contact list in the connected Constant Contact account.');

const ContactListSchema = z.object({
    list_id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    favorite: z.boolean(),
    created_at: z.string(),
    updated_at: z.string()
});

const OutputSchema = z
    .object({
        list_id: z.string().describe('Unique ID of the created contact list. Example: "c3639a04-bc12-11f1-aa3a-02420a320002"'),
        name: z.string().describe('Name of the created contact list. Example: "Newsletter Subscribers"'),
        description: z.string().optional().describe('Description of the created contact list. Omitted when no description was provided.'),
        favorite: z.boolean().describe('Whether the created contact list is marked as a favorite.'),
        created_at: z.string().describe('ISO 8601 timestamp of when the contact list was created. Example: "2026-09-29T14:33:39Z"'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the contact list was last updated. Example: "2026-09-29T14:33:39Z"')
    })
    .describe('The newly created contact list.');

/**
 * @tags: [write]
 * @tagReason: Creates a new contact list on the connected Constant Contact account.
 * @pitfalls: Creating a list with a name that already exists in the account fails with a 409 conflict error instead of updating the existing list.
 */
const action = createAction({
    description: 'Create a contact list.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html
            endpoint: '/v3/contact_lists',
            data: {
                name: input.name,
                ...(input.description !== undefined && { description: input.description }),
                ...(input.favorite !== undefined && { favorite: input.favorite })
            },
            // Creating a list is not idempotent; a retry after a lost response could create a duplicate list.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- retries must stay 0 for this non-idempotent create
            retries: 0
        };
        const response = await nango.post(config);

        const list = ContactListSchema.parse(response.data);

        return {
            list_id: list.list_id,
            name: list.name,
            ...(list.description !== undefined && { description: list.description }),
            favorite: list.favorite,
            created_at: list.created_at,
            updated_at: list.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
