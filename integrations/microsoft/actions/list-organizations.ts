import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    $select: z.string().optional().describe('Comma-separated list of properties to include in the response.'),
    $filter: z.string().optional().describe('OData filter to narrow results.'),
    $top: z.number().optional().describe('Number of items to return per page.'),
    $skip: z.number().optional().describe('Number of items to skip.'),
    $count: z.boolean().optional().describe('Include a count of the total number of items.')
});

const AssignedPlanSchema = z
    .object({
        assignedDateTime: z.string().optional(),
        capabilityStatus: z.string().optional(),
        service: z.string().optional(),
        servicePlanId: z.string().optional()
    })
    .passthrough();

const VerifiedDomainSchema = z
    .object({
        capabilities: z.string().optional(),
        isDefault: z.boolean().optional(),
        isInitial: z.boolean().optional(),
        name: z.string().optional(),
        type: z.string().optional()
    })
    .passthrough();

const ProvisionedPlanSchema = z
    .object({
        capabilityStatus: z.string().optional(),
        provisioningStatus: z.string().optional(),
        service: z.string().optional()
    })
    .passthrough();

const ProviderOrganizationSchema = z
    .object({
        id: z.string(),
        displayName: z.string().optional().nullable(),
        createdDateTime: z.string().optional().nullable(),
        businessPhones: z.array(z.string()).optional(),
        city: z.string().optional().nullable(),
        country: z.string().optional().nullable(),
        countryLetterCode: z.string().optional().nullable(),
        defaultUsageLocation: z.string().optional().nullable(),
        marketingNotificationEmails: z.array(z.string()).optional(),
        onPremisesLastSyncDateTime: z.string().optional().nullable(),
        onPremisesSyncEnabled: z.boolean().optional().nullable(),
        postalCode: z.string().optional().nullable(),
        preferredLanguage: z.string().optional().nullable(),
        securityComplianceNotificationMails: z.array(z.string()).optional(),
        securityComplianceNotificationPhones: z.array(z.string()).optional(),
        state: z.string().optional().nullable(),
        street: z.string().optional().nullable(),
        technicalNotificationMails: z.array(z.string()).optional(),
        tenantType: z.string().optional().nullable(),
        assignedPlans: z.array(AssignedPlanSchema).optional(),
        verifiedDomains: z.array(VerifiedDomainSchema).optional(),
        provisionedPlans: z.array(ProvisionedPlanSchema).optional()
    })
    .passthrough();

const OrganizationOutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    createdDateTime: z.string().optional(),
    businessPhones: z.array(z.string()).optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    countryLetterCode: z.string().optional(),
    defaultUsageLocation: z.string().optional(),
    marketingNotificationEmails: z.array(z.string()).optional(),
    onPremisesLastSyncDateTime: z.string().optional(),
    onPremisesSyncEnabled: z.boolean().optional(),
    postalCode: z.string().optional(),
    preferredLanguage: z.string().optional(),
    securityComplianceNotificationMails: z.array(z.string()).optional(),
    securityComplianceNotificationPhones: z.array(z.string()).optional(),
    state: z.string().optional(),
    street: z.string().optional(),
    technicalNotificationMails: z.array(z.string()).optional(),
    tenantType: z.string().optional(),
    assignedPlans: z.array(AssignedPlanSchema).optional(),
    verifiedDomains: z.array(VerifiedDomainSchema).optional(),
    provisionedPlans: z.array(ProvisionedPlanSchema).optional()
});

const OutputSchema = z.object({
    organizations: z.array(OrganizationOutputSchema),
    count: z.number().optional(),
    nextLink: z.string().optional()
});

const action = createAction({
    description: 'List organizations from Microsoft Graph.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Organization.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input['$select'] !== undefined) {
            params['$select'] = input['$select'];
        }
        if (input['$filter'] !== undefined) {
            params['$filter'] = input['$filter'];
        }
        if (input['$top'] !== undefined) {
            params['$top'] = input['$top'];
        }
        if (input['$skip'] !== undefined) {
            params['$skip'] = input['$skip'];
        }
        if (input['$count'] !== undefined) {
            params['$count'] = String(input['$count']);
        }

        // https://learn.microsoft.com/en-us/graph/api/organization-list
        const response = await nango.get({
            endpoint: '/v1.0/organization',
            params: params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Microsoft Graph API'
            });
        }

        const data = response.data;
        const rawValue = 'value' in data ? data['value'] : undefined;
        if (!Array.isArray(rawValue)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Microsoft Graph API returned a response without a value array'
            });
        }

        const organizations = rawValue.map((item: unknown) => {
            const org = ProviderOrganizationSchema.parse(item);
            return {
                id: org.id,
                ...(org.displayName != null && { displayName: org.displayName }),
                ...(org.createdDateTime != null && { createdDateTime: org.createdDateTime }),
                ...(org.businessPhones !== undefined && { businessPhones: org.businessPhones }),
                ...(org.city != null && { city: org.city }),
                ...(org.country != null && { country: org.country }),
                ...(org.countryLetterCode != null && { countryLetterCode: org.countryLetterCode }),
                ...(org.defaultUsageLocation != null && { defaultUsageLocation: org.defaultUsageLocation }),
                ...(org.marketingNotificationEmails !== undefined && { marketingNotificationEmails: org.marketingNotificationEmails }),
                ...(org.onPremisesLastSyncDateTime != null && { onPremisesLastSyncDateTime: org.onPremisesLastSyncDateTime }),
                ...(org.onPremisesSyncEnabled != null && { onPremisesSyncEnabled: org.onPremisesSyncEnabled }),
                ...(org.postalCode != null && { postalCode: org.postalCode }),
                ...(org.preferredLanguage != null && { preferredLanguage: org.preferredLanguage }),
                ...(org.securityComplianceNotificationMails !== undefined && { securityComplianceNotificationMails: org.securityComplianceNotificationMails }),
                ...(org.securityComplianceNotificationPhones !== undefined && {
                    securityComplianceNotificationPhones: org.securityComplianceNotificationPhones
                }),
                ...(org.state != null && { state: org.state }),
                ...(org.street != null && { street: org.street }),
                ...(org.technicalNotificationMails !== undefined && { technicalNotificationMails: org.technicalNotificationMails }),
                ...(org.tenantType != null && { tenantType: org.tenantType }),
                ...(org.assignedPlans !== undefined && { assignedPlans: org.assignedPlans }),
                ...(org.verifiedDomains !== undefined && { verifiedDomains: org.verifiedDomains }),
                ...(org.provisionedPlans !== undefined && { provisionedPlans: org.provisionedPlans })
            };
        });

        const result: z.infer<typeof OutputSchema> = {
            organizations: organizations
        };

        const countValue = '@odata.count' in data ? data['@odata.count'] : undefined;
        if (typeof countValue === 'number') {
            result.count = countValue;
        }

        const nextLinkValue = '@odata.nextLink' in data ? data['@odata.nextLink'] : undefined;
        if (typeof nextLinkValue === 'string') {
            result.nextLink = nextLinkValue;
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
