import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        list_id: z.string().describe('ID of the contact list to update. Example: "c3639a04-bc12-11f1-aa3a-02420a320002"'),
        name: z.string().optional().describe('New name for the contact list. Omit to keep the current name.'),
        description: z
            .string()
            .nullable()
            .optional()
            .describe('New description for the contact list. Omit to keep the current description; set to null to clear it.'),
        favorite: z.boolean().optional().describe('Whether the contact list is marked as a favorite. Omit to keep the current value.')
    })
    .describe('Fields for updating a contact list. At least one of name, description, or favorite must be provided.');

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
        list_id: z.string().describe('Unique ID of the updated contact list.'),
        name: z.string().describe('Name of the contact list after the update.'),
        description: z.string().optional().describe('Description of the contact list. Present only when the list has a description.'),
        favorite: z.boolean().describe('Whether the contact list is marked as a favorite.'),
        created_at: z.string().describe('ISO 8601 timestamp of when the contact list was created. Example: "2026-09-29T14:33:39Z"'),
        updated_at: z.string().describe('ISO 8601 timestamp of when the contact list was last updated.')
    })
    .describe('The updated contact list.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the contact list's current state before writing the update.
 * @pitfalls: Constant Contact replaces the full list state on update, so omitted fields keep whatever values are currently on the list at call time; an update that changes nothing leaves updated_at unchanged.
 */
const action = createAction({
    description: "Update a contact list's name, description, or favorite flag.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.name === undefined && input.description === undefined && input.favorite === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one of name, description, or favorite must be provided.'
            });
        }

        // https://v3.developer.constantcontact.com/api_reference/index.html - GET /v3/contact_lists/{list_id}
        const currentResponse = await nango.get({
            endpoint: `/v3/contact_lists/${encodeURIComponent(input.list_id)}`,
            retries: 3
        });

        const current = ContactListSchema.parse(currentResponse.data);

        const description = input.description !== undefined ? input.description : current.description;

        // https://v3.developer.constantcontact.com/api_reference/index.html - PUT /v3/contact_lists/{list_id}
        // The provider requires name and favorite on every update, so omitted fields are resent with their current values.
        const response = await nango.put({
            endpoint: `/v3/contact_lists/${encodeURIComponent(input.list_id)}`,
            data: {
                name: input.name ?? current.name,
                favorite: input.favorite ?? current.favorite,
                ...(description !== undefined && { description })
            },
            // PUT applies the full desired list state, so a retry after a lost response repeats the same state and is safe.
            retries: 3
        });

        const updated = ContactListSchema.parse(response.data);

        return {
            list_id: updated.list_id,
            name: updated.name,
            ...(updated.description !== undefined && { description: updated.description }),
            favorite: updated.favorite,
            created_at: updated.created_at,
            updated_at: updated.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
