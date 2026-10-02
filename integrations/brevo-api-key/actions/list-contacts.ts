import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z.number().int().min(1).max(1000).optional().describe('Number of contacts to return per page. Defaults to 50, maximum 1000. Example: 100'),
        offset: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe('Index of the first contact of the page, used to page through results. Defaults to 0. Example: 100'),
        modifiedSince: z
            .string()
            .optional()
            .describe('Only return contacts modified after this UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ). Example: "2024-01-15T00:00:00.000Z"'),
        sort: z.enum(['asc', 'desc']).optional().describe('Sort order of the results by contact creation date. Defaults to "desc" (newest first).')
    })
    .describe('Optional filters and pagination controls for listing contacts.');

const ContactSchema = z.object({
    id: z.number(),
    email: z.string().optional(),
    attributes: z.record(z.string(), z.unknown()),
    emailBlacklisted: z.boolean(),
    smsBlacklisted: z.boolean(),
    whatsappBlacklisted: z.boolean(),
    listIds: z.array(z.number()),
    listUnsubscribed: z.array(z.number()).nullable().optional(),
    createdAt: z.string(),
    modifiedAt: z.string()
});

const ProviderResponseSchema = z.object({
    contacts: z.array(ContactSchema),
    count: z.number()
});

const ContactOutputSchema = z.object({
    id: z.number().describe('Unique numeric ID of the contact. Example: 247'),
    email: z.string().optional().describe('Email address of the contact. Omitted for contacts that have no email address.'),
    attributes: z.record(z.string(), z.unknown()).describe('Custom attributes of the contact, keyed by attribute name (e.g. FIRSTNAME, LASTNAME).'),
    emailBlacklisted: z.boolean().describe('Whether the contact is blacklisted from email campaigns.'),
    smsBlacklisted: z.boolean().describe('Whether the contact is blacklisted from SMS campaigns.'),
    whatsappBlacklisted: z.boolean().describe('Whether the contact is blacklisted from WhatsApp campaigns.'),
    listIds: z.array(z.number()).describe('IDs of the contact lists the contact belongs to. Empty when the contact is on no list.'),
    listUnsubscribed: z.array(z.number()).optional().describe('IDs of the contact lists the contact has unsubscribed from, when any.'),
    createdAt: z
        .string()
        .describe(
            'Date-time at which the contact was created, as an ISO 8601 timestamp with a provider-determined UTC offset (e.g. "2017-05-02T16:40:31+02:00"), not necessarily "Z"/UTC.'
        ),
    modifiedAt: z
        .string()
        .describe(
            'Date-time at which the contact was last modified, as an ISO 8601 timestamp with a provider-determined UTC offset (e.g. "2017-05-02T16:40:31+02:00"), not necessarily "Z"/UTC.'
        )
});

const OutputSchema = z
    .object({
        contacts: z.array(ContactOutputSchema).describe('Contacts of the account for the requested page.'),
        count: z.number().describe('Total number of contacts in the account matching the given filters, across all pages.'),
        nextOffset: z
            .number()
            .optional()
            .describe('Offset value to pass as input.offset to fetch the next page of contacts. Omitted when no further contacts remain. Example: 50')
    })
    .describe('Page of contacts and the total contact count.');

/**
 * @tags: [read]
 * @tagReason: Fetches contacts from the provider without modifying any data.
 * @pitfalls: Results default to 50 contacts per page (maximum 1000) sorted by creation date descending, so pass limit, offset, and sort to page through larger accounts. Sorting always orders by creation date, even when modifiedSince is used.
 */
const action = createAction({
    description: 'List contacts in the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/get-contacts
            endpoint: '/contacts',
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.modifiedSince !== undefined && { modifiedSince: input.modifiedSince }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderResponseSchema.parse(response.data);
        const offset = input.offset ?? 0;
        const nextOffset = offset + parsed.contacts.length < parsed.count ? offset + parsed.contacts.length : undefined;

        return {
            contacts: parsed.contacts.map((contact) => ({
                id: contact.id,
                ...(contact.email !== undefined && { email: contact.email }),
                attributes: contact.attributes,
                emailBlacklisted: contact.emailBlacklisted,
                smsBlacklisted: contact.smsBlacklisted,
                whatsappBlacklisted: contact.whatsappBlacklisted,
                listIds: contact.listIds,
                ...(contact.listUnsubscribed != null && { listUnsubscribed: contact.listUnsubscribed }),
                createdAt: contact.createdAt,
                modifiedAt: contact.modifiedAt
            })),
            count: parsed.count,
            ...(nextOffset !== undefined && { nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
