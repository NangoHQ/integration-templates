import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationsResponseSchema = z.object({
    organizations: z.array(
        z.object({
            organization_id: z.string()
        })
    )
});

const ProviderCustomFieldSchema = z.object({
    value: z.unknown().optional(),
    index: z.number().nullish(),
    label: z.string().nullish()
});

const ProviderTagSchema = z.object({
    tag_id: z.union([z.string(), z.number()]).nullish(),
    tag_name: z.string().nullish()
});

const ProviderContactSchema = z.object({
    contact_id: z.string(),
    contact_name: z.string().nullish(),
    company_name: z.string().nullish(),
    customer_name: z.string().nullish(),
    vendor_name: z.string().nullish(),
    contact_type: z.string().nullish(),
    contact_type_formatted: z.string().nullish(),
    status: z.string().nullish(),
    customer_sub_type: z.string().nullish(),
    source: z.string().nullish(),
    is_linked_with_zohocrm: z.boolean().nullish(),
    payment_terms: z.number().nullish(),
    payment_terms_id: z.string().nullish(),
    payment_terms_label: z.string().nullish(),
    currency_id: z.string().nullish(),
    currency_code: z.string().nullish(),
    website: z.string().nullish(),
    language_code: z.string().nullish(),
    language_code_formatted: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    email: z.string().nullish(),
    phone: z.string().nullish(),
    mobile: z.string().nullish(),
    twitter: z.string().nullish(),
    facebook: z.string().nullish(),
    outstanding_receivable_amount: z.number().nullish(),
    outstanding_receivable_amount_bcy: z.number().nullish(),
    outstanding_payable_amount: z.number().nullish(),
    outstanding_payable_amount_bcy: z.number().nullish(),
    unused_credits_receivable_amount: z.number().nullish(),
    unused_credits_receivable_amount_bcy: z.number().nullish(),
    unused_credits_payable_amount: z.number().nullish(),
    unused_credits_payable_amount_bcy: z.number().nullish(),
    portal_status: z.string().nullish(),
    portal_status_formatted: z.string().nullish(),
    created_time: z.string().nullish(),
    created_time_formatted: z.string().nullish(),
    last_modified_time: z.string().nullish(),
    last_modified_time_formatted: z.string().nullish(),
    ach_supported: z.boolean().nullish(),
    has_attachment: z.boolean().nullish(),
    tags: z.array(ProviderTagSchema).nullish(),
    custom_fields: z.array(ProviderCustomFieldSchema).nullish(),
    contactperson_custom_fields: z.array(ProviderCustomFieldSchema).nullish(),
    custom_field_hash: z.record(z.string(), z.unknown()).nullish()
});

const CustomFieldSchema = z
    .object({
        value: z.unknown().optional().describe('Value stored in the custom field; may be a string, number, or boolean depending on the field type.'),
        index: z.number().optional().describe('Position of the custom field in the organization custom field list.'),
        label: z.string().optional().describe('Display label of the custom field.')
    })
    .describe('A single custom field value attached to the contact.');

const TagSchema = z
    .object({
        tag_id: z.union([z.string(), z.number()]).optional().describe('Unique identifier of the tag.'),
        tag_name: z.string().optional().describe('Display name of the tag.')
    })
    .describe('A tag assigned to the contact.');

const ContactSchema = z
    .object({
        id: z.string().describe('Unique contact identifier (same value as contact_id).'),
        contact_id: z.string().describe('Zoho Inventory contact ID, e.g. "260815000000097001".'),
        contact_name: z.string().optional().describe('Display name of the contact, e.g. "Acme Corp".'),
        company_name: z.string().optional().describe('Company name associated with the contact.'),
        customer_name: z.string().optional().describe('Name used when the contact acts as a customer.'),
        vendor_name: z.string().optional().describe('Name used when the contact acts as a vendor.'),
        contact_type: z.string().optional().describe('Role of the contact: "customer" or "vendor".'),
        contact_type_formatted: z.string().optional().describe('Human-readable contact type, e.g. "Customer".'),
        status: z.string().optional().describe('Contact status: "active" or "inactive".'),
        customer_sub_type: z.string().optional().describe('Customer sub type, e.g. "business" or "individual".'),
        source: z.string().optional().describe('Origin of the contact record, e.g. "api" or "web".'),
        is_linked_with_zohocrm: z.boolean().optional().describe('Whether the contact is linked to a Zoho CRM record.'),
        payment_terms: z.number().optional().describe('Payment term in days.'),
        payment_terms_id: z.string().optional().describe('Identifier of the assigned payment terms.'),
        payment_terms_label: z.string().optional().describe('Display label of the payment terms, e.g. "Due on Receipt".'),
        currency_id: z.string().optional().describe('Identifier of the contact currency.'),
        currency_code: z.string().optional().describe('ISO currency code, e.g. "USD".'),
        website: z.string().optional().describe('Website URL of the contact.'),
        language_code: z.string().optional().describe('Language code of the contact.'),
        language_code_formatted: z.string().optional().describe('Human-readable language of the contact.'),
        first_name: z.string().optional().describe('First name of the primary contact person.'),
        last_name: z.string().optional().describe('Last name of the primary contact person.'),
        email: z.string().optional().describe('Primary email address of the contact.'),
        phone: z.string().optional().describe('Landline phone number of the contact.'),
        mobile: z.string().optional().describe('Mobile phone number of the contact.'),
        twitter: z.string().optional().describe('Twitter handle of the contact.'),
        facebook: z.string().optional().describe('Facebook handle of the contact.'),
        outstanding_receivable_amount: z.number().optional().describe('Amount receivable from the contact in organization currency.'),
        outstanding_receivable_amount_bcy: z.number().optional().describe('Amount receivable from the contact in base currency.'),
        outstanding_payable_amount: z.number().optional().describe('Amount payable to the contact in organization currency.'),
        outstanding_payable_amount_bcy: z.number().optional().describe('Amount payable to the contact in base currency.'),
        unused_credits_receivable_amount: z.number().optional().describe('Unused customer credits available to the contact.'),
        unused_credits_receivable_amount_bcy: z.number().optional().describe('Unused customer credits available in base currency.'),
        unused_credits_payable_amount: z.number().optional().describe('Unused vendor credits available from the contact.'),
        unused_credits_payable_amount_bcy: z.number().optional().describe('Unused vendor credits available in base currency.'),
        portal_status: z.string().optional().describe('Customer portal access status, e.g. "disabled".'),
        portal_status_formatted: z.string().optional().describe('Human-readable customer portal access status.'),
        created_time: z.string().optional().describe('Creation timestamp in Zoho format, e.g. "2026-06-09T09:45:19-0400".'),
        created_time_formatted: z.string().optional().describe('Human-readable creation date.'),
        last_modified_time: z.string().optional().describe('Last modification timestamp in Zoho format, e.g. "2026-06-09T13:15:33-0400".'),
        last_modified_time_formatted: z.string().optional().describe('Human-readable last modification date.'),
        ach_supported: z.boolean().optional().describe('Whether ACH payments are supported for the contact.'),
        has_attachment: z.boolean().optional().describe('Whether the contact has any attachments.'),
        tags: z.array(TagSchema).optional().describe('Tags assigned to the contact.'),
        custom_fields: z.array(CustomFieldSchema).optional().describe('Custom field values attached to the contact.'),
        contactperson_custom_fields: z.array(CustomFieldSchema).optional().describe('Custom field values attached to the contact person.'),
        custom_field_hash: z.record(z.string(), z.unknown()).optional().describe('Map of custom field labels to their values.')
    })
    .describe('A Zoho Inventory customer or vendor contact.');

const CheckpointSchema = z
    .object({
        page: z.number().int().positive().describe('Next page to request when resuming an interrupted full refresh.')
    })
    .describe('Checkpoint storing the next contacts page to request during a full refresh.');

const sync = createSync({
    description: 'Sync all customer/vendor contacts in the organization.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['ZohoInventory.contacts.READ'],
    models: {
        Contact: ContactSchema
    },

    exec: async (nango) => {
        // The organization_id is required on every request. Resolve it at runtime so the
        // sync works without connection metadata (this connection has a single organization).
        // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
        const organizationsResponse = await nango.get({
            endpoint: '/inventory/v1/organizations',
            retries: 3
        });

        const parsedOrganizations = OrganizationsResponseSchema.safeParse(organizationsResponse.data);
        if (!parsedOrganizations.success) {
            throw new Error(`Failed to parse organizations response: ${parsedOrganizations.error.message}`);
        }

        const organization = parsedOrganizations.data.organizations[0];
        if (!organization) {
            throw new Error('No Zoho Inventory organization found for this connection');
        }
        const organizationId = organization.organization_id;

        const checkpoint = CheckpointSchema.nullable().parse(await nango.getCheckpoint());
        let nextPage: number | undefined = checkpoint?.page ?? 1;

        // Full refresh: the contacts list endpoint has no modified-since filter (last_modified_time
        // is only a sortable column, not a filter), so delete detection still needs a full successful
        // scan. The page/per_page pagination is checkpointed so an interrupted run resumes from the
        // next page instead of re-fetching earlier pages.
        await nango.trackDeletesStart('Contact');

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/inventory/api/v1/contacts/#list-contacts
            endpoint: '/inventory/v1/contacts',
            params: {
                organization_id: organizationId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'contacts',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const contacts of nango.paginate<z.infer<typeof ProviderContactSchema>>(proxyConfig)) {
            const parsedContacts = z.array(ProviderContactSchema).safeParse(contacts);
            if (!parsedContacts.success) {
                throw new Error(`Failed to parse contacts from provider response: ${parsedContacts.error.message}`);
            }

            const mappedContacts = parsedContacts.data.map(mapContact);

            if (mappedContacts.length > 0) {
                await nango.batchSave(mappedContacts, 'Contact');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Contact');
    }
});

function mapContact(contact: z.infer<typeof ProviderContactSchema>): z.infer<typeof ContactSchema> {
    return {
        id: contact.contact_id,
        contact_id: contact.contact_id,
        ...(contact.contact_name != null && { contact_name: contact.contact_name }),
        ...(contact.company_name != null && { company_name: contact.company_name }),
        ...(contact.customer_name != null && { customer_name: contact.customer_name }),
        ...(contact.vendor_name != null && { vendor_name: contact.vendor_name }),
        ...(contact.contact_type != null && { contact_type: contact.contact_type }),
        ...(contact.contact_type_formatted != null && { contact_type_formatted: contact.contact_type_formatted }),
        ...(contact.status != null && { status: contact.status }),
        ...(contact.customer_sub_type != null && { customer_sub_type: contact.customer_sub_type }),
        ...(contact.source != null && { source: contact.source }),
        ...(contact.is_linked_with_zohocrm != null && { is_linked_with_zohocrm: contact.is_linked_with_zohocrm }),
        ...(contact.payment_terms != null && { payment_terms: contact.payment_terms }),
        ...(contact.payment_terms_id != null && { payment_terms_id: contact.payment_terms_id }),
        ...(contact.payment_terms_label != null && { payment_terms_label: contact.payment_terms_label }),
        ...(contact.currency_id != null && { currency_id: contact.currency_id }),
        ...(contact.currency_code != null && { currency_code: contact.currency_code }),
        ...(contact.website != null && { website: contact.website }),
        ...(contact.language_code != null && { language_code: contact.language_code }),
        ...(contact.language_code_formatted != null && { language_code_formatted: contact.language_code_formatted }),
        ...(contact.first_name != null && { first_name: contact.first_name }),
        ...(contact.last_name != null && { last_name: contact.last_name }),
        ...(contact.email != null && { email: contact.email }),
        ...(contact.phone != null && { phone: contact.phone }),
        ...(contact.mobile != null && { mobile: contact.mobile }),
        ...(contact.twitter != null && { twitter: contact.twitter }),
        ...(contact.facebook != null && { facebook: contact.facebook }),
        ...(contact.outstanding_receivable_amount != null && { outstanding_receivable_amount: contact.outstanding_receivable_amount }),
        ...(contact.outstanding_receivable_amount_bcy != null && { outstanding_receivable_amount_bcy: contact.outstanding_receivable_amount_bcy }),
        ...(contact.outstanding_payable_amount != null && { outstanding_payable_amount: contact.outstanding_payable_amount }),
        ...(contact.outstanding_payable_amount_bcy != null && { outstanding_payable_amount_bcy: contact.outstanding_payable_amount_bcy }),
        ...(contact.unused_credits_receivable_amount != null && { unused_credits_receivable_amount: contact.unused_credits_receivable_amount }),
        ...(contact.unused_credits_receivable_amount_bcy != null && { unused_credits_receivable_amount_bcy: contact.unused_credits_receivable_amount_bcy }),
        ...(contact.unused_credits_payable_amount != null && { unused_credits_payable_amount: contact.unused_credits_payable_amount }),
        ...(contact.unused_credits_payable_amount_bcy != null && { unused_credits_payable_amount_bcy: contact.unused_credits_payable_amount_bcy }),
        ...(contact.portal_status != null && { portal_status: contact.portal_status }),
        ...(contact.portal_status_formatted != null && { portal_status_formatted: contact.portal_status_formatted }),
        ...(contact.created_time != null && { created_time: contact.created_time }),
        ...(contact.created_time_formatted != null && { created_time_formatted: contact.created_time_formatted }),
        ...(contact.last_modified_time != null && { last_modified_time: contact.last_modified_time }),
        ...(contact.last_modified_time_formatted != null && { last_modified_time_formatted: contact.last_modified_time_formatted }),
        ...(contact.ach_supported != null && { ach_supported: contact.ach_supported }),
        ...(contact.has_attachment != null && { has_attachment: contact.has_attachment }),
        ...(contact.tags != null && {
            tags: contact.tags.map((tag) => ({
                ...(tag.tag_id != null && { tag_id: tag.tag_id }),
                ...(tag.tag_name != null && { tag_name: tag.tag_name })
            }))
        }),
        ...(contact.custom_fields != null && {
            custom_fields: contact.custom_fields.map((field) => ({
                ...(field.value !== undefined && { value: field.value }),
                ...(field.index != null && { index: field.index }),
                ...(field.label != null && { label: field.label })
            }))
        }),
        ...(contact.contactperson_custom_fields != null && {
            contactperson_custom_fields: contact.contactperson_custom_fields.map((field) => ({
                ...(field.value !== undefined && { value: field.value }),
                ...(field.index != null && { index: field.index }),
                ...(field.label != null && { label: field.label })
            }))
        }),
        ...(contact.custom_field_hash != null && { custom_field_hash: contact.custom_field_hash })
    };
}

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
