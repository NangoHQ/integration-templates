import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z.array(z.object({ organization_id: z.string() })).optional()
});

const InputSchema = z.object({
    estimate_id: z.string().describe('Unique identifier of the estimate. Example: "260815000000101017"'),
    organization_id: z.string().optional().describe('Zoho Books organization ID. If omitted, the first organization ID is fetched from the API.')
});

const TagSchema = z
    .object({
        tag_id: z.string().optional(),
        tag_name: z.string().optional(),
        tag_option_id: z.string().optional(),
        tag_option_name: z.string().optional(),
        is_tag_mandatory: z.boolean().optional()
    })
    .passthrough();

const CustomFieldSchema = z
    .object({
        index: z.number().optional(),
        show_on_pdf: z.boolean().optional(),
        value: z.string().optional(),
        label: z.string().optional()
    })
    .passthrough();

const AddressSchema = z
    .object({
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.union([z.string(), z.number()]).optional(),
        country: z.string().optional(),
        fax: z.string().optional()
    })
    .passthrough();

const TaxSchema = z
    .object({
        tax_name: z.string().optional(),
        tax_amount: z.number().optional()
    })
    .passthrough();

const CommunicationPreferenceSchema = z
    .object({
        is_email_enabled: z.boolean().optional(),
        is_sms_enabled: z.boolean().optional(),
        is_whatsapp_enabled: z.boolean().optional()
    })
    .passthrough();

const ContactPersonSchema = z
    .object({
        contact_person_id: z.union([z.string(), z.number()]).optional(),
        contact_person_name: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        contact_person_email: z.string().optional(),
        phone: z.string().optional(),
        mobile: z.string().optional(),
        communication_preference: CommunicationPreferenceSchema.optional()
    })
    .passthrough();

const ProjectSchema = z
    .object({
        project_id: z.union([z.string(), z.number()]).optional(),
        project_name: z.string().optional()
    })
    .passthrough();

const LineItemSchema = z
    .object({
        item_id: z.union([z.string(), z.number()]).optional(),
        line_item_id: z.union([z.string(), z.number()]).optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        item_order: z.number().optional(),
        product_type: z.string().optional(),
        sat_item_key_code: z.union([z.string(), z.number()]).optional(),
        unitkey_code: z.string().optional(),
        bcy_rate: z.number().optional(),
        rate: z.number().optional(),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        discount_amount: z.number().optional(),
        discount: z.number().optional(),
        tax_id: z.union([z.string(), z.number()]).optional(),
        tds_tax_id: z.union([z.string(), z.number()]).optional(),
        tax_name: z.string().optional(),
        tax_type: z.string().optional(),
        tax_percentage: z.number().optional(),
        tax_treatment_code: z.string().optional(),
        item_total: z.number().optional(),
        location_id: z.union([z.string(), z.number()]).optional(),
        location_name: z.string().optional(),
        tags: z.array(TagSchema).optional()
    })
    .passthrough();

const EstimateSchema = z
    .object({
        estimate_id: z.union([z.string(), z.number()]),
        estimate_number: z.string().optional(),
        date: z.string().optional(),
        reference_number: z.string().optional(),
        is_pre_gst: z.boolean().optional(),
        place_of_supply: z.string().optional(),
        gst_no: z.string().optional(),
        gst_treatment: z.string().optional(),
        tax_treatment: z.string().optional(),
        is_reverse_charge_applied: z.boolean().optional(),
        status: z.string().optional(),
        customer_id: z.union([z.string(), z.number()]).optional(),
        customer_name: z.string().optional(),
        contact_persons_associated: z.array(ContactPersonSchema).optional(),
        currency_id: z.union([z.string(), z.number()]).optional(),
        currency_code: z.string().optional(),
        exchange_rate: z.number().optional(),
        expiry_date: z.string().optional(),
        discount: z.number().optional(),
        is_discount_before_tax: z.boolean().optional(),
        discount_type: z.string().optional(),
        is_inclusive_tax: z.boolean().optional(),
        is_viewed_by_client: z.boolean().optional(),
        client_viewed_time: z.string().optional(),
        line_items: z.array(LineItemSchema).optional(),
        location_id: z.union([z.string(), z.number()]).optional(),
        location_name: z.string().optional(),
        shipping_charge: z.number().optional(),
        adjustment: z.number().optional(),
        adjustment_description: z.string().optional(),
        sub_total: z.number().optional(),
        total: z.number().optional(),
        tax_total: z.number().optional(),
        price_precision: z.number().optional(),
        taxes: z.array(TaxSchema).optional(),
        billing_address: AddressSchema.optional(),
        shipping_address: AddressSchema.optional(),
        custom_fields: z.array(CustomFieldSchema).optional(),
        template_id: z.union([z.string(), z.number()]).optional(),
        template_name: z.string().optional(),
        created_time: z.string().optional(),
        last_modified_time: z.string().optional(),
        salesperson_id: z.union([z.string(), z.number()]).optional(),
        salesperson_name: z.string().optional(),
        project: ProjectSchema.optional(),
        tags: z.array(TagSchema).optional()
    })
    .passthrough();

const OutputSchema = EstimateSchema;

const action = createAction({
    description: 'Retrieve a single estimate from Zoho Books.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-estimate'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoBooks.estimates.READ', 'ZohoBooks.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/books/api/v3/organizations/#overview
                endpoint: '/books/v3/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0 || !orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Books account.'
                });
            }
            organizationId = singleOrg.organization_id;
        }

        const response = await nango.get({
            // https://www.zoho.com/books/api/v3/estimates/#get-an-estimate
            endpoint: `/books/v3/estimates/${encodeURIComponent(input.estimate_id)}`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Zoho Books API.'
            });
        }

        const WrapperSchema = z.object({
            code: z.number().optional(),
            message: z.string().optional(),
            estimate: z.unknown()
        });

        const wrapper = WrapperSchema.parse(response.data);
        const estimateData = wrapper.estimate;

        if (!estimateData || typeof estimateData !== 'object' || Array.isArray(estimateData)) {
            throw new nango.ActionError({
                type: 'estimate_not_found',
                message: 'Estimate not found in the response.',
                estimate_id: input.estimate_id
            });
        }

        return EstimateSchema.parse(estimateData);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
