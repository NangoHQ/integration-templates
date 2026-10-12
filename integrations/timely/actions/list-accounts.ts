import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({}).describe('No input is required to list the accounts for a connection.');

const CurrencySchema = z.object({
    id: z.string().describe('Currency identifier. Example: "kes"'),
    name: z.string().describe('Currency display name. Example: "Kenyan Shilling"'),
    iso_code: z.string().describe('ISO 4217 currency code. Example: "KES"'),
    symbol: z.string().describe('Currency symbol. Example: "KSh"'),
    symbol_first: z.boolean().describe('Whether the currency symbol is displayed before the amount.')
});

const LogoSchema = z.object({
    large_retina: z.string().nullable().describe('URL of the large retina account logo, or null when not set.'),
    medium_retina: z.string().nullable().describe('URL of the medium retina account logo, or null when not set.'),
    small_retina: z.string().nullable().describe('URL of the small retina account logo, or null when not set.'),
    brand_logo: z.boolean().describe('Whether the account uses a custom brand logo.')
});

const CapacitySchema = z.object({
    hours: z.number().describe('Capacity hours component.'),
    minutes: z.number().describe('Capacity minutes component.'),
    seconds: z.number().describe('Capacity seconds component.'),
    formatted: z.string().describe('Human-readable capacity. Example: "40:00"'),
    total_hours: z.number().describe('Total capacity expressed in hours.'),
    total_seconds: z.number().describe('Total capacity expressed in seconds.'),
    total_minutes: z.number().describe('Total capacity expressed in minutes.')
});

const FeatureSchema = z.object({
    name: z.string().describe('Feature identifier. Example: "api_access"'),
    days: z.number().describe('Days remaining for the feature, or -1 when the feature is not time-limited.')
});

const AccountSchema = z.object({
    id: z.number().describe('Timely account ID. Pass this value as account_id to every other action and sync in this registry. Example: 1145787'),
    name: z.string().describe('Account display name. Example: "Nango Developer"'),
    color: z.string().describe('Account accent color as a hex string without the leading "#".'),
    currency: CurrencySchema.describe('Currency configured for the account.'),
    logo: LogoSchema.describe('Account logo URLs and brand-logo flag.'),
    from: z.string().describe('Origin of the account. Example: "Web"'),
    max_users: z.number().describe('Maximum number of users allowed, or 0 when unlimited.'),
    seats: z.number().describe('Number of purchased seats.'),
    max_projects: z.number().describe('Maximum number of projects allowed, or 0 when unlimited.'),
    plan_id: z.number().describe('Numeric plan identifier.'),
    plan_name: z.string().describe('Human-readable plan name. Example: "Unlimited"'),
    next_charge: z.string().nullable().describe('Date of the next charge in YYYY-MM-DD format, or null when there is none.'),
    start_of_week: z.number().describe('First day of the week (0 = Sunday).'),
    created_at: z.number().describe('Account creation time as a Unix timestamp in seconds.'),
    payment_mode: z.string().describe('Billing mode. Example: "web"'),
    paid: z.boolean().describe('Whether the account is on a paid plan.'),
    company_size: z.string().describe('Reported company size.'),
    plan_code: z.string().describe('Internal plan code. Example: "timely_unlimited_aug_23_yearly"'),
    plan_custom: z.boolean().describe('Whether the account uses a custom plan.'),
    appstore_transaction_id: z.string().nullable().describe('App Store transaction ID when subscribed via the App Store, otherwise null.'),
    owner_id: z.number().describe('User ID of the account owner.'),
    weekly_user_capacity: z.number().describe('Default weekly capacity per user, in hours.'),
    default_work_days: z.string().describe('Comma-separated default work days. Example: "MON,TUE,WED,THU,FRI"'),
    default_hour_rate: z.number().describe('Default hourly rate for the account.'),
    support_email: z.string().describe('Support email address for the account.'),
    estimated_company_size: z.string().nullable().describe('Estimated company size, or null when not set.'),
    industry: z.string().nullable().describe('Industry of the account, or null when not set.'),
    memory_retention_days: z.number().describe('Number of days memories are retained.'),
    tic_force_enable: z.boolean().describe('Whether Timely in-app integrations are force-enabled.'),
    num_users: z.number().describe('Number of active users in the account.'),
    num_projects: z.number().describe('Number of projects in the account.'),
    active_projects_count: z.number().describe('Number of active projects in the account.'),
    total_projects_count: z.number().describe('Total number of projects in the account, including inactive ones.'),
    capacity: CapacitySchema.describe('Default weekly capacity for a user.'),
    can_purchase_extra_seats: z.boolean().describe('Whether the account can purchase additional seats.'),
    status: z.string().describe('Account status. Example: "trial"'),
    beta: z.boolean().describe('Whether the account is enrolled in a beta program.'),
    azure_ad_enabled: z.boolean().describe('Whether Azure AD single sign-on is enabled.'),
    expired: z.boolean().describe('Whether the account has expired.'),
    trial: z.boolean().describe('Whether the account is on a trial.'),
    days_to_end_trial: z.number().describe('Number of days remaining in the trial.'),
    features: z.array(FeatureSchema).describe('Features enabled for the account.')
});

const OutputSchema = z.array(AccountSchema).describe('Timely accounts accessible by this connection.');

/**
 * @tags: [read]
 * @tagReason: Reads the list of Timely accounts accessible by the connection; no provider state is modified.
 * @pitfalls: The returned id is the account_id required by every other Timely action and sync in this registry, so call this action first; all accessible accounts are returned in one response with no pagination.
 */
const action = createAction({
    description: 'List the Timely accounts this connection can access, to discover the account_id required by every other action/sync in this registry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['manage'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        // Timely API reference: https://developer.timely.com/ (login-walled). Confirmed live: GET /1.1/accounts (plural, no account_id) returns a bare JSON array; GET /1.1/account (singular) returns 404.
        const response = await nango.get({
            endpoint: '/1.1/accounts',
            retries: 3
        });

        return z.array(AccountSchema).parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
