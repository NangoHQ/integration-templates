import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input parameters are required; the connected business is resolved from the connection.');

const ProviderAddressSchema = z.object({
    address1: z.string().nullable().optional(),
    address2: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    postal_code: z.string().nullable().optional()
});

const OutputAddressSchema = z.object({
    address1: z.string().optional().describe('First line of the business billing address, e.g. "28 W 23rd St, Floor 2".'),
    address2: z.string().optional().describe('Second line of the business billing address, when present.'),
    city: z.string().optional().describe('City of the business billing address, e.g. "New York".'),
    state: z.string().optional().describe('State or region of the business billing address, e.g. "NY".'),
    country: z.string().optional().describe('ISO country code of the business billing address, e.g. "US".'),
    postal_code: z.string().optional().describe('Postal/ZIP code of the business billing address, e.g. "10010".')
});

const AmountSchema = z.object({
    value: z.number().describe('Amount in the smallest currency unit (for USD, cents).'),
    currency: z.string().describe('ISO 4217 currency code, e.g. "USD".')
});

const ProviderBusinessSchema = z.object({
    id: z.string().optional(),
    business_name_legal: z.string().optional(),
    business_name_on_card: z.string().optional(),
    phone: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    active: z.boolean().optional(),
    enforce_sso: z.boolean().optional(),
    is_integrated_with_slack: z.boolean().optional(),
    is_reimbursements_enabled: z.boolean().optional(),
    limit_locked: z.boolean().optional(),
    initial_approved_limit: z.number().nullable().optional(),
    initial_approved_limit_amount: AmountSchema.nullable().optional(),
    created_time: z.string().optional(),
    billing_address: ProviderAddressSchema.nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().optional().describe('Unique identifier of the connected business.'),
        business_name_legal: z.string().optional().describe('Legal name of the business entity, e.g. "Save Time Inc".'),
        business_name_on_card: z.string().optional().describe('Business name that appears on issued cards.'),
        phone: z.string().optional().describe('Primary contact phone number for the business.'),
        website: z.string().optional().describe('Company website, e.g. "www.ramp.com".'),
        active: z.boolean().optional().describe('Whether the business account is active.'),
        enforce_sso: z.boolean().optional().describe('Whether single sign-on is enforced for the business.'),
        is_integrated_with_slack: z.boolean().optional().describe('Whether the business has integrated with Slack.'),
        is_reimbursements_enabled: z.boolean().optional().describe('Whether the reimbursements feature is enabled for the business.'),
        limit_locked: z.boolean().optional().describe('Whether the business credit limit is locked and cannot be modified.'),
        initial_approved_limit: z.number().optional().describe('Initial approved card credit limit in whole US dollars (USD).'),
        initial_approved_limit_amount: AmountSchema.optional().describe(
            'Initial approved card credit limit in minor units (cents) with an explicit currency; omitted when no limit has been approved.'
        ),
        created_time: z.string().optional().describe('ISO 8601 timestamp of when the business account was created.'),
        billing_address: OutputAddressSchema.optional().describe('Billing address of the business.')
    })
    .describe('The connected business profile.');

function mapAddress(address: z.infer<typeof ProviderAddressSchema> | null | undefined): z.infer<typeof OutputAddressSchema> | null {
    if (address == null) {
        return null;
    }

    return {
        ...(address.address1 != null && { address1: address.address1 }),
        ...(address.address2 != null && { address2: address.address2 }),
        ...(address.city != null && { city: address.city }),
        ...(address.state != null && { state: address.state }),
        ...(address.country != null && { country: address.country }),
        ...(address.postal_code != null && { postal_code: address.postal_code })
    };
}

/**
 * @tags: [read]
 * @tagReason: Fetches the connected business's profile without modifying any provider data.
 * @pitfalls: `initial_approved_limit` is in whole US dollars while `initial_approved_limit_amount.value` is in cents; `initial_approved_limit_amount` is omitted when the business has no approved limit.
 */
const action = createAction({
    description: "Get the connected business's own profile (legal name, address, phone, card limits).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['business:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.ramp.com/openapi/developer-api.json (GET /developer/v1/business)
        const response = await nango.get({
            endpoint: '/developer/v1/business',
            retries: 3
        });

        const business = ProviderBusinessSchema.parse(response.data);
        const billingAddress = mapAddress(business.billing_address);

        return {
            ...(business.id != null && { id: business.id }),
            ...(business.business_name_legal != null && { business_name_legal: business.business_name_legal }),
            ...(business.business_name_on_card != null && { business_name_on_card: business.business_name_on_card }),
            ...(business.phone != null && { phone: business.phone }),
            ...(business.website != null && { website: business.website }),
            ...(business.active != null && { active: business.active }),
            ...(business.enforce_sso != null && { enforce_sso: business.enforce_sso }),
            ...(business.is_integrated_with_slack != null && { is_integrated_with_slack: business.is_integrated_with_slack }),
            ...(business.is_reimbursements_enabled != null && { is_reimbursements_enabled: business.is_reimbursements_enabled }),
            ...(business.limit_locked != null && { limit_locked: business.limit_locked }),
            ...(business.initial_approved_limit != null && { initial_approved_limit: business.initial_approved_limit }),
            ...(business.initial_approved_limit_amount != null && { initial_approved_limit_amount: business.initial_approved_limit_amount }),
            ...(business.created_time != null && { created_time: business.created_time }),
            ...(billingAddress != null && { billing_address: billingAddress })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
