import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        email: z.string().email().describe('Email address of the contact to create. Example: "jane.doe@example.com"'),
        attributes: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Contact attributes to set, keyed by attribute name in capital letters. The attributes must already exist in the Brevo account. Example: { "FIRSTNAME": "Jane", "LASTNAME": "Doe" }'
            ),
        listIds: z.array(z.number()).optional().describe('IDs of the Brevo lists to add the contact to. Example: [2, 7]'),
        updateEnabled: z
            .boolean()
            .optional()
            .describe('When true, an existing contact with the same email is updated instead of returning an error. Defaults to false.')
    })
    .describe('Input for creating a Brevo contact');

const OutputSchema = z
    .object({
        id: z
            .number()
            .optional()
            .describe(
                'Numeric ID of the newly created contact. Example: 42. Omitted when an existing contact was updated via updateEnabled because Brevo returns an empty response in that case.'
            )
    })
    .describe('Result of creating a Brevo contact');

const ProviderCreateContactResponseSchema = z.object({
    id: z.number().optional()
});

/**
 * Creates a new Brevo contact.
 *
 * @tags: [write]
 * @tagReason: Creates a new contact in the provider without reading or deleting any provider data.
 * @pitfalls: Returns only the new contact's numeric ID, so a follow-up get is needed for the full record. Fails with a duplicate_parameter error if the email already exists unless updateEnabled is true. Attribute names must be passed in capital letters and must already exist in the Brevo account; values whose types do not match the attribute definition are silently ignored.
 */
const action = createAction({
    description: 'Create a new contact',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/createcontact
            endpoint: '/contacts',
            data: {
                email: input.email,
                ...(input.attributes !== undefined && { attributes: input.attributes }),
                ...(input.listIds !== undefined && { listIds: input.listIds }),
                ...(input.updateEnabled !== undefined && { updateEnabled: input.updateEnabled })
            },
            // retries: 0 — creating a contact is not idempotent and has no idempotency key, so retrying after a lost response could attempt a duplicate create.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- the plugin only accepts positive integers, but this create call must not be retried.
            retries: 0
        };

        const response = await nango.post(config);

        const parsed = ProviderCreateContactResponseSchema.parse(response.data ?? {});
        return {
            ...(parsed.id !== undefined && { id: parsed.id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
