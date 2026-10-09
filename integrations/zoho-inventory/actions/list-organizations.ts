import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationSchema = z.object({
    organization_id: z
        .string()
        .describe(
            'Unique identifier of the organization. Pass this as the organization_id query parameter on every other Zoho Inventory call. Example: "927270289"'
        ),
    name: z.string().describe('Display name of the organization. Example: "Nango Dev"'),
    org_alias_name: z.string().optional().describe('Alias name of the organization.'),
    contact_name: z.string().optional().describe('Name of the primary contact person for the organization.'),
    email: z.string().optional().describe('Email address associated with the organization.'),
    is_default_org: z.boolean().optional().describe('Whether this is the default organization for the connected user.'),
    is_org_active: z.boolean().optional().describe('Whether the organization is currently active.'),
    plan_name: z.string().optional().describe('Name of the subscription plan. Example: "PREMIUM TRIAL"'),
    plan_type: z.number().optional().describe('Numeric identifier of the subscription plan.'),
    language_code: z.string().optional().describe('Language code configured for the organization. Example: "en"'),
    time_zone: z.string().optional().describe('Time zone configured for the organization. Example: "America/New_York"'),
    fiscal_year_start_month: z.number().optional().describe('Starting month of the fiscal year, zero-based (0 = January).'),
    account_created_date: z.string().optional().describe('Date the organization account was created. Example: "2026-10-09"'),
    account_created_date_formatted: z.string().optional().describe('Human-readable organization account creation date. Example: "09 Oct 2026"'),
    currency_id: z.string().optional().describe('Unique identifier of the organization base currency.'),
    currency_code: z.string().optional().describe('ISO code of the organization base currency. Example: "USD"'),
    currency_symbol: z.string().optional().describe('Symbol of the organization base currency. Example: "$"'),
    currency_format: z.string().optional().describe('Number format used for the organization base currency. Example: "###,##0.00"'),
    price_precision: z.number().optional().describe('Number of decimal places used for prices.'),
    tax_group_enabled: z.boolean().optional().describe('Whether tax groups are enabled for the organization.'),
    country: z.string().optional().describe('Country of the organization. Example: "U.S.A"'),
    country_code: z.string().optional().describe('Two-letter country code of the organization. Example: "US"'),
    mode: z.string().optional().describe('Operating mode of the organization. Example: "live"'),
    is_quick_setup_completed: z.boolean().optional().describe('Whether the organization has completed its initial setup.'),
    org_joined_app_list: z.array(z.string()).optional().describe('Zoho Finance applications activated for this organization. Example: ["books", "inventory"]')
});

const InputSchema = z.object({}).describe('No input parameters are required to list organizations.');

const OutputSchema = z
    .object({
        organizations: z.array(OrganizationSchema).describe('Every organization visible to the connected Zoho account.')
    })
    .describe('List of Zoho Inventory organizations accessible to the connection.');

const ProviderResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    organizations: z.array(OrganizationSchema)
});

/**
 * @tags: [read]
 * @tagReason: Reads the list of organizations from the provider; no provider state is modified.
 * @pitfalls: A listed organization is not guaranteed to have Zoho Inventory activated, so other calls can still fail even when it appears here; results are unpaginated and may contain more than one organization.
 */
const action = createAction({
    description: 'List every Zoho organization this connection can see, to discover the organization_id required on every other call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.settings.READ'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
        const response = await nango.get({
            endpoint: '/inventory/v1/organizations',
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            organizations: parsed.organizations
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
