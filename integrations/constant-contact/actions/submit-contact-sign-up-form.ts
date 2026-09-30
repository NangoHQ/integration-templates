import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        email_address: z.string().describe('Email address of the contact to add or update. Passed as a plain string. Example: "jane.doe@example.com"'),
        first_name: z.string().optional().describe('First name of the contact. Example: "Jane"'),
        last_name: z.string().optional().describe('Last name of the contact. Example: "Doe"'),
        source: z
            .enum(['Account', 'Contact'])
            .optional()
            .describe(
                'Who is adding the contact. "Contact" records explicit opt-in permission (use this for form sign-ups); "Account" records implicit permission. Exactly one of source or list_memberships must be provided.'
            ),
        list_memberships: z
            .array(z.string())
            .optional()
            .describe(
                'IDs of the contact lists to subscribe the contact to. Exactly one of source or list_memberships must be provided. Example: ["c3639a04-bc12-11f1-aa3a-02420a320002"]'
            )
    })
    .describe('Sign-up form submission. Provide the contact email, optional names, and exactly one of source or list_memberships.');

const OutputSchema = z
    .object({
        contact_id: z.string().describe('Unique identifier of the created or updated contact. Example: "c36c8dda-bc12-11f1-aa3a-02420a320002"'),
        action: z.enum(['created', 'updated']).describe('Whether a new contact was created or an existing contact with the same email address was updated.')
    })
    .describe('Result of the sign-up form submission.');

const ProviderResponseSchema = z.object({
    contact_id: z.string(),
    action: z.enum(['created', 'updated'])
});

/**
 * @tags: [write]
 * @tagReason: Creates or updates a contact in Constant Contact via the sign-up form submission endpoint.
 * @pitfalls: Exactly one of source or list_memberships must be provided; passing both or neither fails validation. source "Contact" records explicit email permission while "Account" records implicit permission. Submitting an existing email updates that contact instead of creating a duplicate, and because contact deletion is eventually consistent, resubmitting a recently deleted email can return "updated" with the prior contact id rather than "created".
 */
const action = createAction({
    description: "Add or update a contact via Constant Contact's public opt-in/sign-up-form submission endpoint.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['contact_data'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const hasSource = input.source !== undefined;
        const hasListMemberships = input.list_memberships !== undefined;
        if (hasSource === hasListMemberships) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide exactly one of "source" or "list_memberships".',
                source: input.source ?? null,
                list_memberships: input.list_memberships ?? null
            });
        }

        // https://v3.developer.constantcontact.com/api_reference/index.html (Contacts -> Sign Up Form)
        // Non-idempotent upsert: a retry after a lost response would repeat the submission and report "updated" instead of "created".
        const response = await nango.post({
            endpoint: '/v3/contacts/sign_up_form',
            data: {
                email_address: input.email_address,
                ...(input.first_name !== undefined && { first_name: input.first_name }),
                ...(input.last_name !== undefined && { last_name: input.last_name }),
                ...(input.source !== undefined && { source: input.source }),
                ...(input.list_memberships !== undefined && { list_memberships: input.list_memberships })
            },
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate retries: 0: this is a non-idempotent upsert with no idempotency key, and a retry after a lost response would repeat the submission and report "updated" instead of "created".
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            contact_id: parsed.contact_id,
            action: parsed.action
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
