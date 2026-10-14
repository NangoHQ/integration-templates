import { z } from 'zod';
import { createAction } from 'nango';

const ProviderVendorContactSchema = z.object({
    id: z.string(),
    email: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    phone: z.string().nullable(),
    is_default: z.boolean()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderVendorContactSchema),
    page: z.object({
        next: z.string().nullable()
    })
});

const InputSchema = z
    .object({
        vendor_id: z.string().min(1).describe('Unique identifier of the vendor whose contacts to list. Example: "effa4ecc-59f7-423b-9747-56dafc7c66da".'),
        cursor: z
            .string()
            .min(1)
            .optional()
            .describe('Pagination cursor: the ID of the last contact returned by the previous page. Omit to fetch the first page.'),
        page_size: z
            .number()
            .int()
            .min(2)
            .max(100)
            .optional()
            .describe('Number of contacts to return per page, between 2 and 100. Defaults to 20 when omitted.')
    })
    .describe('Identifies the vendor and the page of contacts to retrieve.');

const ContactSchema = z.object({
    id: z.string().describe('Unique identifier of the vendor contact.'),
    email: z.string().describe('Email address of the vendor contact.'),
    first_name: z.string().optional().describe('First name of the vendor contact, when set.'),
    last_name: z.string().optional().describe('Last name of the vendor contact, when set.'),
    phone: z.string().optional().describe('Phone number of the vendor contact, when set.'),
    is_default: z.boolean().describe("Whether this contact is the vendor's default contact, used for bill-pay remittance.")
});

const OutputSchema = z
    .object({
        contacts: z.array(ContactSchema).describe('Contacts associated with the vendor.'),
        next_cursor: z.string().optional().describe('Cursor to pass back as `cursor` to fetch the next page. Omitted when there are no more contacts.')
    })
    .describe('A page of vendor contacts plus the cursor for the next page.');

/**
 * @tags: [read]
 * @tagReason: Reads the vendor's contacts from the provider without creating, updating, or deleting any resource.
 * @pitfalls: Contacts are served from a read replica, so recently created or edited contacts may not appear immediately; first_name, last_name, and phone are omitted when the provider stores no value.
 */
const action = createAction({
    description: 'List contacts associated with a vendor.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['vendors:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/vendors/{vendor_id}/contacts)
            endpoint: `/developer/v1/vendors/${encodeURIComponent(input.vendor_id)}/contacts`,
            params: {
                ...(input.cursor !== undefined && { start: input.cursor }),
                ...(input.page_size !== undefined && { page_size: input.page_size })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const nextCursor = parsed.page.next != null ? new URL(parsed.page.next, 'https://api.ramp.com').searchParams.get('start') : null;

        return {
            contacts: parsed.data.map((contact) => ({
                id: contact.id,
                email: contact.email,
                is_default: contact.is_default,
                ...(contact.first_name != null && { first_name: contact.first_name }),
                ...(contact.last_name != null && { last_name: contact.last_name }),
                ...(contact.phone != null && { phone: contact.phone })
            })),
            ...(nextCursor != null && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
