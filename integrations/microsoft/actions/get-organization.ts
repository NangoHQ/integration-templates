import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().min(1).describe('Organization ID. Example: "56480ae2-88be-49cf-86f6-d62a45bf8758"')
});

const VerifiedDomainSchema = z
    .object({
        capabilities: z.string().optional(),
        isDefault: z.boolean().optional(),
        isInitial: z.boolean().optional(),
        name: z.string().optional(),
        type: z.string().optional()
    })
    .passthrough();

const AssignedPlanSchema = z
    .object({
        assignedDateTime: z.string().optional(),
        capabilityStatus: z.string().optional(),
        service: z.string().optional(),
        servicePlanId: z.string().optional()
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
        displayName: z.string().optional(),
        businessPhones: z.array(z.string()).optional(),
        city: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        countryLetterCode: z.string().optional(),
        createdDateTime: z.string().optional(),
        deletedDateTime: z.string().nullable().optional(),
        marketingNotificationEmails: z.array(z.string()).optional(),
        onPremisesLastSyncDateTime: z.string().nullable().optional(),
        onPremisesSyncEnabled: z.boolean().nullable().optional(),
        postalCode: z.string().nullable().optional(),
        preferredLanguage: z.string().optional(),
        securityComplianceNotificationMails: z.array(z.string()).optional(),
        securityComplianceNotificationPhones: z.array(z.string()).optional(),
        state: z.string().nullable().optional(),
        street: z.string().nullable().optional(),
        technicalNotificationMails: z.array(z.string()).optional(),
        tenantType: z.string().optional(),
        verifiedDomains: z.array(VerifiedDomainSchema).optional(),
        assignedPlans: z.array(AssignedPlanSchema).optional(),
        provisionedPlans: z.array(ProvisionedPlanSchema).optional(),
        privacyProfile: z.any().optional(),
        branding: z.any().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    businessPhones: z.array(z.string()).optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    countryLetterCode: z.string().optional(),
    createdDateTime: z.string().optional(),
    deletedDateTime: z.string().optional(),
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
    verifiedDomains: z.array(VerifiedDomainSchema).optional(),
    assignedPlans: z.array(AssignedPlanSchema).optional(),
    provisionedPlans: z.array(ProvisionedPlanSchema).optional()
});

const action = createAction({
    description: 'Retrieve a single organization from Microsoft.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-organization',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Organization.Read.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/graph/api/organization-get
        const response = await nango.get({
            endpoint: `/v1.0/organization/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Organization not found',
                organizationId: input.id
            });
        }

        const providerOrg = ProviderOrganizationSchema.parse(response.data);

        return {
            id: providerOrg.id,
            ...(providerOrg.displayName !== undefined && { displayName: providerOrg.displayName }),
            ...(providerOrg.businessPhones !== undefined && { businessPhones: providerOrg.businessPhones }),
            ...(providerOrg.city !== undefined && providerOrg.city !== null && { city: providerOrg.city }),
            ...(providerOrg.country !== undefined && providerOrg.country !== null && { country: providerOrg.country }),
            ...(providerOrg.countryLetterCode !== undefined && { countryLetterCode: providerOrg.countryLetterCode }),
            ...(providerOrg.createdDateTime !== undefined && { createdDateTime: providerOrg.createdDateTime }),
            ...(providerOrg.deletedDateTime !== undefined && providerOrg.deletedDateTime !== null && { deletedDateTime: providerOrg.deletedDateTime }),
            ...(providerOrg.marketingNotificationEmails !== undefined && { marketingNotificationEmails: providerOrg.marketingNotificationEmails }),
            ...(providerOrg.onPremisesLastSyncDateTime !== undefined &&
                providerOrg.onPremisesLastSyncDateTime !== null && { onPremisesLastSyncDateTime: providerOrg.onPremisesLastSyncDateTime }),
            ...(providerOrg.onPremisesSyncEnabled !== undefined &&
                providerOrg.onPremisesSyncEnabled !== null && { onPremisesSyncEnabled: providerOrg.onPremisesSyncEnabled }),
            ...(providerOrg.postalCode !== undefined && providerOrg.postalCode !== null && { postalCode: providerOrg.postalCode }),
            ...(providerOrg.preferredLanguage !== undefined && { preferredLanguage: providerOrg.preferredLanguage }),
            ...(providerOrg.securityComplianceNotificationMails !== undefined && {
                securityComplianceNotificationMails: providerOrg.securityComplianceNotificationMails
            }),
            ...(providerOrg.securityComplianceNotificationPhones !== undefined && {
                securityComplianceNotificationPhones: providerOrg.securityComplianceNotificationPhones
            }),
            ...(providerOrg.state !== undefined && providerOrg.state !== null && { state: providerOrg.state }),
            ...(providerOrg.street !== undefined && providerOrg.street !== null && { street: providerOrg.street }),
            ...(providerOrg.technicalNotificationMails !== undefined && { technicalNotificationMails: providerOrg.technicalNotificationMails }),
            ...(providerOrg.tenantType !== undefined && { tenantType: providerOrg.tenantType }),
            ...(providerOrg.verifiedDomains !== undefined && { verifiedDomains: providerOrg.verifiedDomains }),
            ...(providerOrg.assignedPlans !== undefined && { assignedPlans: providerOrg.assignedPlans }),
            ...(providerOrg.provisionedPlans !== undefined && { provisionedPlans: providerOrg.provisionedPlans })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
