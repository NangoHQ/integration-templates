import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        list_id: z.string().describe('The unique ID of the contact list to retrieve. Example: "c3639a04-bc12-11f1-aa3a-02420a320002"'),
        include_membership_count: z
            .enum(['all', 'active'])
            .optional()
            .describe(
                'Set to "all" to include the total number of contacts on the list, or "active" to count only active (mailable) contacts. Omit to exclude the membership count.'
            )
    })
    .describe('Input for retrieving a single Constant Contact contact list');

const ProviderContactListSchema = z.object({
    list_id: z.string(),
    name: z.string(),
    favorite: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    membership_count: z.number().int().optional()
});

const OutputSchema = z
    .object({
        list_id: z.string().describe('The unique ID of the contact list. Example: "c3639a04-bc12-11f1-aa3a-02420a320002"'),
        name: z.string().describe('The display name of the contact list. Example: "My Contacts"'),
        favorite: z.boolean().optional().describe('Whether the contact list is marked as a favorite in the Constant Contact account'),
        created_at: z.string().optional().describe('ISO 8601 timestamp of when the contact list was created. Example: "2026-09-29T14:33:39Z"'),
        updated_at: z.string().optional().describe('ISO 8601 timestamp of when the contact list was last updated. Example: "2026-09-29T14:33:39Z"'),
        membership_count: z
            .number()
            .int()
            .optional()
            .describe(
                'Number of contacts on the list, counted according to include_membership_count ("all" counts every member, "active" counts only mailable members). Omitted unless include_membership_count is set.'
            )
    })
    .describe('A single Constant Contact contact list');

/**
 * @tags: [read]
 * @tagReason: Fetches a single contact list from Constant Contact without modifying any provider state.
 * @pitfalls: Contact list deletion is asynchronous in Constant Contact, so a list targeted by a recent delete request may still be returned until the delete job completes. membership_count is only included in the response when include_membership_count is set.
 */
const action = createAction({
    description: 'Retrieve a single contact list',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://v3.developer.constantcontact.com/api_reference/index.html (Contact Lists > Get a Contact List)
            endpoint: `/v3/contact_lists/${encodeURIComponent(input.list_id)}`,
            params: {
                ...(input.include_membership_count !== undefined && { include_membership_count: input.include_membership_count })
            },
            retries: 3
        };
        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Contact list not found',
                list_id: input.list_id
            });
        }

        const contactList = ProviderContactListSchema.parse(response.data);

        return {
            list_id: contactList.list_id,
            name: contactList.name,
            ...(contactList.favorite != null && { favorite: contactList.favorite }),
            ...(contactList.created_at != null && { created_at: contactList.created_at }),
            ...(contactList.updated_at != null && { updated_at: contactList.updated_at }),
            ...(contactList.membership_count != null && { membership_count: contactList.membership_count })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
