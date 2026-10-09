import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z
    .object({
        organization_id: z.string().describe('Zoho Invoice organization ID. Example: "927270289".')
    })
    .describe('Connection metadata required by the contacts sync.');

const ProviderCustomFieldSchema = z.object({
    label: z.string().nullish(),
    value: z.string().nullish(),
    index: z.number().nullish()
});

const ProviderContactSchema = z.object({
    contact_id: z.string(),
    contact_name: z.string().nullish(),
    customer_name: z.string().nullish(),
    vendor_name: z.string().nullish(),
    company_name: z.string().nullish(),
    website: z.string().nullish(),
    language_code: z.string().nullish(),
    contact_type: z.string().nullish(),
    status: z.string().nullish(),
    customer_sub_type: z.string().nullish(),
    source: z.string().nullish(),
    is_linked_with_zohocrm: z.boolean().nullish(),
    payment_terms: z.number().nullish(),
    payment_terms_id: z.string().nullish(),
    payment_terms_label: z.string().nullish(),
    currency_id: z.string().nullish(),
    currency_code: z.string().nullish(),
    twitter: z.string().nullish(),
    facebook: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    mobile: z.string().nullish(),
    portal_status: z.string().nullish(),
    outstanding_receivable_amount: z.number().nullish(),
    outstanding_receivable_amount_bcy: z.number().nullish(),
    unused_credits_receivable_amount: z.number().nullish(),
    unused_credits_receivable_amount_bcy: z.number().nullish(),
    ach_supported: z.boolean().nullish(),
    has_attachment: z.boolean().nullish(),
    created_time: z.string().nullish(),
    last_modified_time: z.string().nullish(),
    custom_fields: z.array(ProviderCustomFieldSchema).nullish()
});

const CustomFieldSchema = z
    .object({
        label: z.string().optional().describe('Label of the custom field. Example: "VAT ID".'),
        value: z.string().optional().describe('Value of the custom field.'),
        index: z.number().optional().describe('Index position of the custom field (1-10).')
    })
    .describe('A custom field value defined on the contact.');

const ContactSchema = z
    .object({
        id: z.string().describe('Unique contact identifier (Zoho contact_id). Example: "260815000000097001".'),
        contact_name: z.string().optional().describe('Display name of the contact (organisation or individual). Example: "Acme Corp".'),
        customer_name: z.string().optional().describe('Name used when the contact acts as a customer.'),
        vendor_name: z.string().optional().describe('Name used when the contact acts as a vendor.'),
        company_name: z.string().optional().describe('Company name associated with the contact.'),
        website: z.string().optional().describe('Website URL of the contact.'),
        language_code: z.string().optional().describe('Preferred language code of the contact. Example: "en".'),
        contact_type: z.string().optional().describe('Whether the contact is a customer or a vendor. Example: "customer".'),
        status: z.string().optional().describe('Status of the contact. Example: "active".'),
        customer_sub_type: z.string().optional().describe('Customer subtype, business or individual. Example: "business".'),
        source: z.string().optional().describe('Origin of the contact record. Example: "api".'),
        is_linked_with_zohocrm: z.boolean().optional().describe('Whether the contact is linked to a Zoho CRM record.'),
        payment_terms: z.number().optional().describe('Net payment terms in days for the contact.'),
        payment_terms_id: z.string().optional().describe('Identifier of the payment terms used by the contact.'),
        payment_terms_label: z.string().optional().describe('Human-readable payment terms label. Example: "Due on Receipt".'),
        currency_id: z.string().optional().describe('Identifier of the currency used by the contact.'),
        currency_code: z.string().optional().describe('ISO currency code for the contact. Example: "USD".'),
        twitter: z.string().optional().describe('Twitter handle of the contact.'),
        facebook: z.string().optional().describe('Facebook profile of the contact.'),
        first_name: z.string().optional().describe('First name of the primary contact person.'),
        last_name: z.string().optional().describe('Last name of the primary contact person.'),
        email: z.string().optional().describe('Primary email address of the contact. Example: "qa-customer@example.com".'),
        phone: z.string().optional().describe('Primary phone number of the contact.'),
        mobile: z.string().optional().describe('Mobile number of the contact.'),
        portal_status: z.string().optional().describe('Status of the contact self-service portal. Example: "disabled".'),
        outstanding_receivable_amount: z.number().optional().describe('Amount currently owed by the customer in the contact currency.'),
        outstanding_receivable_amount_bcy: z.number().optional().describe('Amount currently owed by the customer in the organization base currency.'),
        unused_credits_receivable_amount: z.number().optional().describe('Unused credit held for the customer in the contact currency.'),
        unused_credits_receivable_amount_bcy: z.number().optional().describe('Unused credit held for the customer in the organization base currency.'),
        ach_supported: z.boolean().optional().describe('Whether ACH payments are supported for the contact.'),
        has_attachment: z.boolean().optional().describe('Whether the contact has any attachments.'),
        created_time: z.string().optional().describe('ISO-8601 timestamp when the contact was created. Example: "2026-06-09T09:45:19-0400".'),
        last_modified_time: z
            .string()
            .optional()
            .describe('ISO-8601 timestamp when the contact was last modified; used as the sync checkpoint. Example: "2026-06-09T13:15:33-0400".'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom field values defined for the contact.')
    })
    .describe('A customer or vendor contact synced from Zoho Invoice.');

const CheckpointSchema = z.object({
    last_modified_time: z.string().describe('last_modified_time filter value for the scan in progress. Empty string means no filter has been applied yet.'),
    page: z.number().int().positive().describe('1-based page number to resume an interrupted scan from.')
});

function isLater(candidate: string, current: string | undefined): boolean {
    if (current === undefined) {
        return true;
    }
    return Date.parse(candidate) > Date.parse(current);
}

const sync = createSync({
    description: 'Sync all customer and vendor contacts from Zoho Invoice, incrementally by last modified time.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    scopes: ['ZohoInvoice.contacts.READ'],
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        if (!parsedMetadata.success) {
            throw new Error('organization_id is required in metadata');
        }
        const organizationId = parsedMetadata.data.organization_id;

        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint != null ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpoint = parsedCheckpoint?.success ? parsedCheckpoint.data : undefined;
        const lastModifiedTime = checkpoint?.last_modified_time !== '' ? checkpoint?.last_modified_time : undefined;
        let page: number | undefined = checkpoint?.page ?? 1;
        let maxLastModifiedTime = lastModifiedTime;

        // The list endpoint supports a last_modified_time filter, so it returns only changed
        // contacts. Deletion detection is intentionally not used here: unchanged contacts are
        // absent from a changed-only response, so trackDeletesEnd() would delete them.
        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/invoice/api/v3/contacts/#list-contacts
            endpoint: '/invoice/v3/contacts',
            params: {
                organization_id: organizationId,
                sort_column: 'last_modified_time',
                sort_order: 'A',
                ...(lastModifiedTime && { last_modified_time: lastModifiedTime })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'contacts',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const contacts of nango.paginate<unknown>(proxyConfig)) {
            const parsedContacts = z.array(ProviderContactSchema).safeParse(contacts);
            if (!parsedContacts.success) {
                throw new Error('Failed to parse contacts from provider response');
            }

            const mappedContacts = parsedContacts.data.map((contact) => ({
                id: contact.contact_id,
                ...(contact.contact_name != null && { contact_name: contact.contact_name }),
                ...(contact.customer_name != null && { customer_name: contact.customer_name }),
                ...(contact.vendor_name != null && { vendor_name: contact.vendor_name }),
                ...(contact.company_name != null && { company_name: contact.company_name }),
                ...(contact.website != null && { website: contact.website }),
                ...(contact.language_code != null && { language_code: contact.language_code }),
                ...(contact.contact_type != null && { contact_type: contact.contact_type }),
                ...(contact.status != null && { status: contact.status }),
                ...(contact.customer_sub_type != null && { customer_sub_type: contact.customer_sub_type }),
                ...(contact.source != null && { source: contact.source }),
                ...(contact.is_linked_with_zohocrm != null && { is_linked_with_zohocrm: contact.is_linked_with_zohocrm }),
                ...(contact.payment_terms != null && { payment_terms: contact.payment_terms }),
                ...(contact.payment_terms_id != null && { payment_terms_id: contact.payment_terms_id }),
                ...(contact.payment_terms_label != null && { payment_terms_label: contact.payment_terms_label }),
                ...(contact.currency_id != null && { currency_id: contact.currency_id }),
                ...(contact.currency_code != null && { currency_code: contact.currency_code }),
                ...(contact.twitter != null && { twitter: contact.twitter }),
                ...(contact.facebook != null && { facebook: contact.facebook }),
                ...(contact.first_name != null && { first_name: contact.first_name }),
                ...(contact.last_name != null && { last_name: contact.last_name }),
                ...(contact.email != null && { email: contact.email }),
                ...(contact.phone != null && { phone: contact.phone }),
                ...(contact.mobile != null && { mobile: contact.mobile }),
                ...(contact.portal_status != null && { portal_status: contact.portal_status }),
                ...(contact.outstanding_receivable_amount != null && { outstanding_receivable_amount: contact.outstanding_receivable_amount }),
                ...(contact.outstanding_receivable_amount_bcy != null && { outstanding_receivable_amount_bcy: contact.outstanding_receivable_amount_bcy }),
                ...(contact.unused_credits_receivable_amount != null && { unused_credits_receivable_amount: contact.unused_credits_receivable_amount }),
                ...(contact.unused_credits_receivable_amount_bcy != null && {
                    unused_credits_receivable_amount_bcy: contact.unused_credits_receivable_amount_bcy
                }),
                ...(contact.ach_supported != null && { ach_supported: contact.ach_supported }),
                ...(contact.has_attachment != null && { has_attachment: contact.has_attachment }),
                ...(contact.created_time != null && { created_time: contact.created_time }),
                ...(contact.last_modified_time != null && { last_modified_time: contact.last_modified_time }),
                ...(contact.custom_fields != null && {
                    custom_fields: contact.custom_fields.map((field) => ({
                        ...(field.label != null && { label: field.label }),
                        ...(field.value != null && { value: field.value }),
                        ...(field.index != null && { index: field.index })
                    }))
                })
            }));

            if (mappedContacts.length > 0) {
                await nango.batchSave(mappedContacts, 'Contact');

                for (const contact of mappedContacts) {
                    if (contact.last_modified_time && isLater(contact.last_modified_time, maxLastModifiedTime)) {
                        maxLastModifiedTime = contact.last_modified_time;
                    }
                }
            }

            // Keep the original filter while paging through this changed window. Only the resume
            // page advances mid-scan; the high-watermark advances after the full scan succeeds.
            if (page !== undefined) {
                await nango.saveCheckpoint({ last_modified_time: lastModifiedTime ?? '', page });
            }
        }

        await nango.saveCheckpoint({
            last_modified_time: maxLastModifiedTime ?? lastModifiedTime ?? '',
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
