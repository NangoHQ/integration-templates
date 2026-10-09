import { z } from 'zod';
import { createAction } from 'nango';

const LicenseDetailsSchema = z
    .object({
        paid: z.boolean().optional().describe('Whether the organization is on a paid plan.'),
        paid_type: z.string().nullable().optional().describe('Paid license type, for example "biginpremier".'),
        paid_expiry: z.string().nullable().optional().describe('ISO 8601 expiry date-time of the paid license.'),
        trial_type: z.string().nullable().optional().describe('Trial license type, for example "biginpremier".'),
        trial_expiry: z.string().nullable().optional().describe('ISO 8601 expiry date-time of the trial license.'),
        users_license_purchased: z.number().nullable().optional().describe('Number of user licenses purchased.')
    })
    .describe('License and trial details for the organization.');

const OrganizationSchema = z
    .object({
        id: z.string().nullable().optional().describe('Unique identifier of the organization.'),
        company_name: z.string().nullable().optional().describe('Name of the company as configured in Bigin.'),
        photo_id: z.string().nullable().optional().describe('Unique identifier of the organization profile photo.'),
        zia_portal_id: z.string().nullable().optional().describe('Unique identifier of the Zia Portal, if configured.'),
        hierarchy_preferences: z
            .object({
                type: z.string().nullable().optional().describe('Hierarchy structure type, for example "Role_Hierarchy".')
            })
            .optional()
            .describe('Preferences for the organization hierarchy structure.'),
        alias: z.string().nullable().optional().describe('Alias name of the organization.'),
        description: z.string().nullable().optional().describe('Free-text description of the organization.'),
        currency: z.string().nullable().optional().describe('Base currency of the organization, for example "US Dollar - USD".'),
        currency_symbol: z.string().nullable().optional().describe('Symbol of the base currency, for example "$".'),
        currency_locale: z.string().nullable().optional().describe('Locale of the base currency, for example "USD".'),
        iso_code: z.string().nullable().optional().describe('ISO code of the base currency, for example "USD".'),
        time_zone: z.string().nullable().optional().describe('Time zone of the organization, for example "Asia/Kolkata".'),
        primary_email: z.string().nullable().optional().describe('Primary email address of the organization.'),
        phone: z.string().nullable().optional().describe('Phone number of the organization.'),
        mobile: z.string().nullable().optional().describe('Mobile number of the organization.'),
        fax: z.string().nullable().optional().describe('Fax number of the organization.'),
        website: z.string().nullable().optional().describe('Website of the organization.'),
        country: z.string().nullable().optional().describe('Country name of the organization address.'),
        country_code: z.string().nullable().optional().describe('Country code of the organization address, for example "US".'),
        city: z.string().nullable().optional().describe('City of the organization address.'),
        state: z.string().nullable().optional().describe('State of the organization address.'),
        street: z.string().nullable().optional().describe('Street of the organization address.'),
        zip: z.string().nullable().optional().describe('Postal code of the organization address.'),
        domain_name: z.string().nullable().optional().describe('Domain name of the organization.'),
        zgid: z.string().nullable().optional().describe('Zoho unique identifier of the organization.'),
        primary_zuid: z.string().nullable().optional().describe('Zoho unique identifier of the primary user.'),
        employee_count: z.number().nullable().optional().describe('Number of employees in the organization.'),
        mc_status: z.boolean().optional().describe('Whether multi-currency is enabled for the organization.'),
        gapps_enabled: z.boolean().optional().describe('Whether Google Apps integration is enabled.'),
        lite_users_enabled: z.boolean().optional().describe('Whether lite users are enabled for the organization.'),
        translation_enabled: z.boolean().optional().describe('Whether translation is enabled for the organization.'),
        privacy_settings: z.boolean().optional().describe('Whether privacy settings are enabled for the organization.'),
        hipaa_compliance_enabled: z.boolean().optional().describe('Whether HIPAA compliance settings are enabled.'),
        deletable_org_account: z.boolean().optional().describe('Whether the organization account is deletable.'),
        license_details: LicenseDetailsSchema.optional()
    })
    .describe('Details of the connected Bigin organization.');

const OrgResponseSchema = z.object({
    org: z.array(OrganizationSchema)
});

/**
 * @tags: [read]
 * @tagReason: Fetches the organization profile from the provider without modifying any provider data.
 * @pitfalls: Unset organization fields (address, phone/fax/mobile, employee_count, license expiry/type) come back as explicit null rather than being omitted, so callers must null-check them instead of assuming a string or number.
 */
const action = createAction({
    description: 'Get information about the connected Bigin organization.',
    version: '1.0.0',
    input: z.object({}).describe('No input required; the organization is resolved from the connection.'),
    output: OrganizationSchema,

    exec: async (nango): Promise<z.infer<typeof OrganizationSchema>> => {
        const response = await nango.get({
            // https://www.bigin.com/developer/docs/apis/v2/get-org-data.html
            endpoint: '/bigin/v2/org',
            retries: 3
        });

        const parsed = OrgResponseSchema.parse(response.data);
        const organization = parsed.org[0];

        if (!organization) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'The provider did not return any organization details.'
            });
        }

        return organization;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
