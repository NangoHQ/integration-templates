import { z } from 'zod';
import { createAction } from 'nango';

const AttributeValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]);

const InputSchema = z
    .object({
        email: z.string().describe('Email address of the contact to subscribe. Example: "jane.doe@example.com"'),
        listId: z.number().int().positive().describe('Numeric ID of the Brevo contact list to subscribe the contact to. Example: 2'),
        attributes: z
            .record(
                z.string(),
                AttributeValueSchema.describe('Attribute value: text, number, boolean or list of strings (for multi-choice attributes). Example: "Doe"')
            )
            .optional()
            .describe(
                'Contact attributes keyed by UPPERCASE attribute name, e.g. {"FIRSTNAME": "Jane", "LASTNAME": "Doe"}. Attributes must already exist in the Brevo account. On an existing contact they are merged: passed keys are set, all other attributes and list memberships are preserved.'
            )
    })
    .describe('Input for subscribing an email address to a Brevo contact list, creating or merging the contact as needed.');

const BrevoContactSchema = z.object({
    id: z.number(),
    email: z.string().optional(),
    emailBlacklisted: z.boolean(),
    smsBlacklisted: z.boolean(),
    whatsappBlacklisted: z.boolean().optional(),
    createdAt: z.string(),
    modifiedAt: z.string(),
    listIds: z.array(z.number()),
    listUnsubscribed: z.array(z.number()).optional(),
    attributes: z.record(z.string(), AttributeValueSchema).optional(),
    statistics: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z
    .object({
        created: z
            .boolean()
            .describe(
                'True when a new contact was created; false when the email already existed and the existing contact was merged (previous attributes and list memberships preserved).'
            ),
        id: z.number().describe('Numeric ID of the contact in Brevo. Example: 42'),
        email: z.string().describe('Email address of the contact. Example: "jane.doe@example.com"'),
        emailBlacklisted: z.boolean().describe('Whether the contact is blacklisted for email campaigns.'),
        smsBlacklisted: z.boolean().describe('Whether the contact is blacklisted for SMS campaigns.'),
        whatsappBlacklisted: z.boolean().optional().describe('Whether the contact is blacklisted for WhatsApp campaigns.'),
        createdAt: z.string().describe('UTC date-time when the contact was created. Example: "2023-01-20T14:53:02.000+01:00"'),
        modifiedAt: z.string().describe('UTC date-time when the contact was last modified. Example: "2023-04-25T18:03:29.000+02:00"'),
        listIds: z.array(z.number()).describe('IDs of the Brevo lists the contact belongs to, including the list it was just subscribed to. Example: [2]'),
        listUnsubscribed: z.array(z.number()).optional().describe('IDs of the lists the contact has unsubscribed from. Example: [5]'),
        attributes: z
            .record(z.string(), AttributeValueSchema.describe('Attribute value: text, number, boolean or list of strings.'))
            .optional()
            .describe('Contact attributes keyed by UPPERCASE attribute name, e.g. {"FIRSTNAME": "Jane"}.'),
        statistics: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
                'Campaign engagement statistics for the recent 90 days (messagesSent, opened, clicked, hardBounces, etc.) keyed by event type. Only present once the contact has campaign history.'
            )
    })
    .describe('The resulting contact after the subscription, including whether it was newly created or merged with an existing contact.');

/**
 * @tags: [read, write]
 * @tagReason: Creates or merges a contact into a Brevo list (write) and then reads back the full contact record (read).
 * @pitfalls: On an existing contact this action merges rather than replaces: passed attributes are set while omitted attributes keep their current values, and list memberships only accumulate (the contact is never removed from any list), so it cannot unsubscribe a contact or clear existing data. Attribute keys must already exist in the Brevo account and be passed in uppercase (e.g. FIRSTNAME); values of the wrong type are silently ignored by Brevo.
 */
const action = createAction({
    description:
        'Subscribe an email address to a Brevo contact list, creating the contact if it is new or merging onto the existing contact if it already exists.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/createcontact
        const upsertResponse = await nango.post({
            endpoint: '/contacts',
            data: {
                email: input.email,
                listIds: [input.listId],
                updateEnabled: true,
                ...(input.attributes !== undefined && { attributes: input.attributes })
            },
            // retries: 0 — the response status is the created-vs-merged signal, so a retry after a lost create response (id returned) would hit the 204 merge branch and misreport the contact as pre-existing.
            retries: 10
        });

        // Brevo signals the branch via status code: a 2xx with {"id": <n>} body means the contact was created, 204 No Content means it already existed and was merged.
        const created = upsertResponse.status !== 204;

        // https://developers.brevo.com/reference/get-contact-info
        const contactResponse = await nango.get({
            endpoint: `/contacts/${encodeURIComponent(input.email)}`,
            retries: 3
        });

        const contact = BrevoContactSchema.parse(contactResponse.data);

        return {
            created,
            id: contact.id,
            email: contact.email ?? input.email,
            emailBlacklisted: contact.emailBlacklisted,
            smsBlacklisted: contact.smsBlacklisted,
            ...(contact.whatsappBlacklisted !== undefined && { whatsappBlacklisted: contact.whatsappBlacklisted }),
            createdAt: contact.createdAt,
            modifiedAt: contact.modifiedAt,
            listIds: contact.listIds,
            ...(contact.listUnsubscribed !== undefined && { listUnsubscribed: contact.listUnsubscribed }),
            ...(contact.attributes !== undefined && { attributes: contact.attributes }),
            ...(contact.statistics !== undefined && { statistics: contact.statistics })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
