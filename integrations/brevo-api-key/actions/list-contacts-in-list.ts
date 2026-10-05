import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        listId: z.number().int().positive().describe('ID of the contact list to retrieve contacts from. Example: 2'),
        limit: z.number().int().min(1).max(500).optional().describe('Maximum number of contacts to return per page (1-500). Defaults to 50 when omitted.'),
        offset: z.number().int().min(0).optional().describe('Index of the first contact of the page for pagination. Defaults to 0 when omitted.'),
        modifiedSince: z
            .string()
            .optional()
            .describe('Only return contacts modified after this UTC date-time (YYYY-MM-DDTHH:mm:ss.SSSZ). Example: "2026-01-01T00:00:00.000Z"'),
        sort: z.enum(['asc', 'desc']).optional().describe('Sort order of the results by record creation date. Defaults to "desc" when omitted.')
    })
    .describe('Input for listing the contacts that belong to a Brevo contact list');

const ContactSchema = z
    .object({
        id: z.number().describe('Unique ID of the contact'),
        email: z.string().optional().describe('Email address of the contact'),
        attributes: z
            .record(z.string(), z.unknown())
            .describe('Set of custom attribute values of the contact, keyed by attribute name (e.g. FIRSTNAME, LASTNAME)'),
        emailBlacklisted: z.boolean().describe('Blacklist status of the contact for email campaigns (true=blacklisted, false=not blacklisted)'),
        smsBlacklisted: z.boolean().describe('Blacklist status of the contact for SMS campaigns (true=blacklisted, false=not blacklisted)'),
        whatsappBlacklisted: z.boolean().describe('Blacklist status of the contact for WhatsApp campaigns (true=blacklisted, false=not blacklisted)'),
        listIds: z.array(z.number()).describe('IDs of the contact lists the contact belongs to'),
        listUnsubscribed: z.array(z.number()).optional().describe('IDs of the contact lists the contact has unsubscribed from'),
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
    })
    .describe('A contact belonging to the requested list');

const OutputSchema = z
    .object({
        contacts: z.array(ContactSchema).describe('Contacts belonging to the requested list, sorted by creation date'),
        count: z.number().describe('Total number of contacts in the list matching the applied filters'),
        nextOffset: z
            .number()
            .optional()
            .describe('Offset value to pass as input.offset to fetch the next page of contacts. Omitted when no further contacts remain. Example: 50')
    })
    .describe('Paginated contacts of a Brevo contact list');

const ProviderContactSchema = ContactSchema.extend({
    // Confirmed live: Brevo returns listUnsubscribed as explicit null for contacts that
    // have never unsubscribed from any list, not as an omitted field.
    listUnsubscribed: z.array(z.number()).nullable().optional()
});

const ProviderResponseSchema = z.object({
    contacts: z.array(ProviderContactSchema),
    count: z.number()
});

/**
 * @tags: [read]
 * @tagReason: Only reads the contacts of a list via a GET request; never mutates provider state.
 * @pitfalls: A nonexistent listId fails the action with a 404 from Brevo rather than returning an empty result. Omitting limit returns only the 50 most recently created contacts; pass limit (max 500) and offset to page through larger lists, using count for the total.
 */
const action = createAction({
    description: 'List the contacts that belong to a specific contact list',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.brevo.com/reference/get-contacts-from-list
        const response = await nango.get({
            endpoint: `/contacts/lists/${encodeURIComponent(String(input.listId))}/contacts`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.offset !== undefined && { offset: input.offset }),
                ...(input.modifiedSince !== undefined && { modifiedSince: input.modifiedSince }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const offset = input.offset ?? 0;
        const nextOffset = offset + parsed.contacts.length < parsed.count ? offset + parsed.contacts.length : undefined;

        return {
            contacts: parsed.contacts.map(({ listUnsubscribed, ...contact }) => ({
                ...contact,
                ...(listUnsubscribed != null && { listUnsubscribed })
            })),
            count: parsed.count,
            ...(nextOffset !== undefined && { nextOffset })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
