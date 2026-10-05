import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        identifier: z.string().min(1).describe('Email address or numeric ID of the contact to update. Example: "user@example.com" or "42".'),
        attributes: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Contact attributes to update, merged into the existing attributes. Keys must be existing uppercase attribute names in the account (e.g. "FIRSTNAME", "LASTNAME"). Pass "EMAIL" here to change the contact\'s email address. Example: { "FIRSTNAME": "Ellie", "LASTNAME": "Rogers" }.'
            ),
        emailBlacklisted: z.boolean().optional().describe('Set to true to blacklist the contact for email campaigns, false to remove the email blacklist.'),
        smsBlacklisted: z.boolean().optional().describe('Set to true to blacklist the contact for SMS campaigns, false to remove the SMS blacklist.'),
        listIds: z
            .array(z.number())
            .optional()
            .describe('IDs of the contact lists to add the contact to. Existing list memberships are preserved. Example: [2, 4].'),
        unlinkListIds: z.array(z.number()).optional().describe('IDs of the contact lists to remove the contact from. Example: [3].')
    })
    .describe(
        'Fields to update on a Brevo contact, addressed by email or numeric ID. Only provided fields are changed (partial merge); omitted fields are left untouched.'
    );

const BrevoContactSchema = z.object({
    id: z.number(),
    email: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()).optional(),
    emailBlacklisted: z.boolean().optional(),
    smsBlacklisted: z.boolean().optional(),
    whatsappBlacklisted: z.boolean().optional(),
    listIds: z.array(z.number()).optional(),
    listUnsubscribed: z.array(z.number()).nullable().optional(),
    createdAt: z.string().optional(),
    modifiedAt: z.string().optional()
});

const OutputSchema = z
    .object({
        id: z.number().describe('Numeric ID of the updated contact. Example: 42.'),
        email: z.string().optional().describe('Email address of the updated contact.'),
        attributes: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Full set of contact attributes after the partial merge, keyed by uppercase attribute name.'),
        emailBlacklisted: z.boolean().optional().describe('Whether the contact is blacklisted for email campaigns after the update.'),
        smsBlacklisted: z.boolean().optional().describe('Whether the contact is blacklisted for SMS campaigns after the update.'),
        whatsappBlacklisted: z.boolean().optional().describe('Whether the contact is blacklisted for WhatsApp campaigns after the update.'),
        listIds: z.array(z.number()).optional().describe('IDs of the contact lists the contact belongs to after the update. Example: [2, 4].'),
        listUnsubscribed: z.array(z.number()).optional().describe('IDs of the contact lists the contact has unsubscribed from.'),
        createdAt: z
            .string()
            .optional()
            .describe(
                'Date-time at which the contact was created, as an ISO 8601 timestamp with a provider-determined UTC offset (e.g. "2017-05-02T16:40:31+02:00"), not necessarily "Z"/UTC.'
            ),
        modifiedAt: z
            .string()
            .optional()
            .describe(
                'Date-time at which the contact was last modified, as an ISO 8601 timestamp with a provider-determined UTC offset (e.g. "2017-05-02T16:40:31+02:00"), not necessarily "Z"/UTC.'
            )
    })
    .describe('The contact as stored in Brevo after the update, read back so the returned state reflects the partial merge.');

/**
 * @tags: [read, write]
 * @tagReason: Updates the contact via a partial-merge PUT and reads back the updated contact via GET.
 * @pitfalls: Partial merge - omitted fields and attributes are left unchanged. Attribute keys must already exist in the account (uppercase) and values of the wrong type are silently ignored. listIds only adds memberships - use unlinkListIds to remove them. Change the email address via attributes.EMAIL; updating the email of an email-blacklisted contact removes that blacklisting and resubscribes them.
 */
const action = createAction({
    description: "Update a contact's attributes, list memberships, or blacklist status (partial merge).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/updatecontact
        await nango.put({
            endpoint: `/contacts/${encodeURIComponent(input.identifier)}`,
            data: {
                ...(input.attributes !== undefined && { attributes: input.attributes }),
                ...(input.emailBlacklisted !== undefined && { emailBlacklisted: input.emailBlacklisted }),
                ...(input.smsBlacklisted !== undefined && { smsBlacklisted: input.smsBlacklisted }),
                ...(input.listIds !== undefined && { listIds: input.listIds }),
                ...(input.unlinkListIds !== undefined && { unlinkListIds: input.unlinkListIds })
            },
            retries: 3
        });

        // If the update changed the email address, the contact is now addressable by the new email.
        const emailAttribute = input.attributes?.['EMAIL'];
        const lookupIdentifier = typeof emailAttribute === 'string' && emailAttribute.length > 0 ? emailAttribute : input.identifier;

        // https://developers.brevo.com/reference/get-contact-info
        const response = await nango.get({
            endpoint: `/contacts/${encodeURIComponent(lookupIdentifier)}`,
            retries: 3
        });

        const contact = BrevoContactSchema.parse(response.data);

        return {
            id: contact.id,
            ...(contact.email !== undefined && { email: contact.email }),
            ...(contact.attributes !== undefined && { attributes: contact.attributes }),
            ...(contact.emailBlacklisted !== undefined && { emailBlacklisted: contact.emailBlacklisted }),
            ...(contact.smsBlacklisted !== undefined && { smsBlacklisted: contact.smsBlacklisted }),
            ...(contact.whatsappBlacklisted !== undefined && { whatsappBlacklisted: contact.whatsappBlacklisted }),
            ...(contact.listIds !== undefined && { listIds: contact.listIds }),
            ...(contact.listUnsubscribed != null && { listUnsubscribed: contact.listUnsubscribed }),
            ...(contact.createdAt !== undefined && { createdAt: contact.createdAt }),
            ...(contact.modifiedAt !== undefined && { modifiedAt: contact.modifiedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
