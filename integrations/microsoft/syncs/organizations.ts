import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://learn.microsoft.com/en-us/graph/api/resources/organization
const OrganizationSchema = z.object({
    id: z.string(),
    displayName: z.string().optional(),
    tenantType: z.string().optional(),
    createdDateTime: z.string().optional(),
    onPremisesLastSyncDateTime: z.string().optional(),
    onPremisesSyncEnabled: z.boolean().optional(),
    postType: z.string().optional(),
    preferredLanguage: z.string().optional(),
    privacyProfile: z
        .object({
            contactEmail: z.string().optional(),
            statementUrl: z.string().optional()
        })
        .optional(),
    provisionedPlans: z
        .array(
            z.object({
                capabilityStatus: z.string().optional(),
                provisioningStatus: z.string().optional(),
                service: z.string().optional()
            })
        )
        .optional(),
    securityComplianceNotificationMails: z.array(z.string()).optional(),
    securityComplianceNotificationPhones: z.array(z.string()).optional(),
    state: z.string().optional(),
    technicalNotificationMails: z.array(z.string()).optional(),
    verifiedDomains: z
        .array(
            z.object({
                capabilities: z.string().optional(),
                isDefault: z.boolean().optional(),
                isInitial: z.boolean().optional(),
                name: z.string().optional(),
                type: z.string().optional()
            })
        )
        .optional()
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    displayName: z.string().nullable().optional(),
    tenantType: z.string().nullable().optional(),
    createdDateTime: z.string().nullable().optional(),
    onPremisesLastSyncDateTime: z.string().nullable().optional(),
    onPremisesSyncEnabled: z.boolean().nullable().optional(),
    postType: z.string().nullable().optional(),
    preferredLanguage: z.string().nullable().optional(),
    privacyProfile: z
        .object({
            contactEmail: z.string().nullable().optional(),
            statementUrl: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    provisionedPlans: z
        .array(
            z.object({
                capabilityStatus: z.string().nullable().optional(),
                provisioningStatus: z.string().nullable().optional(),
                service: z.string().nullable().optional()
            })
        )
        .nullable()
        .optional(),
    securityComplianceNotificationMails: z.array(z.string()).nullable().optional(),
    securityComplianceNotificationPhones: z.array(z.string()).nullable().optional(),
    state: z.string().nullable().optional(),
    technicalNotificationMails: z.array(z.string()).nullable().optional(),
    verifiedDomains: z
        .array(
            z.object({
                capabilities: z.string().nullable().optional(),
                isDefault: z.boolean().nullable().optional(),
                isInitial: z.boolean().nullable().optional(),
                name: z.string().nullable().optional(),
                type: z.string().nullable().optional()
            })
        )
        .nullable()
        .optional()
});

const OrganizationListResponseSchema = z.object({
    value: z.array(ProviderOrganizationSchema),
    '@odata.nextLink': z.string().optional()
});

const CheckpointSchema = z.object({
    nextLink: z.string()
});

function extractPathFromUrl(url: string): string {
    if (url.startsWith('https://')) {
        const urlObj = new URL(url);
        return `${urlObj.pathname}${urlObj.search}`;
    }

    return url;
}

const sync = createSync({
    description: 'Sync organizations from Microsoft',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Organization: OrganizationSchema
    },
    endpoints: [
        {
            path: '/syncs/organizations',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: Microsoft Graph organization endpoint does not support
        // delta queries, updated_since filters, or modification timestamps.
        // Organizations are tenant-level singletons that change infrequently.
        // Full refresh with delete tracking is required.
        const checkpoint = await nango.getCheckpoint();
        await nango.trackDeletesStart('Organization');

        let currentEndpoint = checkpoint?.['nextLink'] ? extractPathFromUrl(checkpoint['nextLink']) : '/v1.0/organization';

        while (true) {
            const proxyConfig: ProxyConfiguration = {
                // https://learn.microsoft.com/en-us/graph/api/organization-list
                endpoint: currentEndpoint,
                retries: 3
            };

            if (!currentEndpoint.includes('?')) {
                proxyConfig.params = { $top: 100 };
            }

            const response = await nango.get(proxyConfig);
            const parsed = OrganizationListResponseSchema.parse(response.data);

            const mappedOrganizations = parsed.value.map((org) => ({
                id: org.id,
                ...(org.displayName != null && { displayName: org.displayName }),
                ...(org.tenantType != null && { tenantType: org.tenantType }),
                ...(org.createdDateTime != null && {
                    createdDateTime: org.createdDateTime
                }),
                ...(org.onPremisesLastSyncDateTime != null && {
                    onPremisesLastSyncDateTime: org.onPremisesLastSyncDateTime
                }),
                ...(org.onPremisesSyncEnabled != null && {
                    onPremisesSyncEnabled: org.onPremisesSyncEnabled
                }),
                ...(org.postType != null && { postType: org.postType }),
                ...(org.preferredLanguage != null && {
                    preferredLanguage: org.preferredLanguage
                }),
                ...(org.privacyProfile != null && {
                    privacyProfile: {
                        ...(org.privacyProfile.contactEmail != null && {
                            contactEmail: org.privacyProfile.contactEmail
                        }),
                        ...(org.privacyProfile.statementUrl != null && {
                            statementUrl: org.privacyProfile.statementUrl
                        })
                    }
                }),
                ...(org.provisionedPlans != null && {
                    provisionedPlans: org.provisionedPlans.map((plan) => ({
                        ...(plan.capabilityStatus != null && {
                            capabilityStatus: plan.capabilityStatus
                        }),
                        ...(plan.provisioningStatus != null && {
                            provisioningStatus: plan.provisioningStatus
                        }),
                        ...(plan.service != null && { service: plan.service })
                    }))
                }),
                ...(org.securityComplianceNotificationMails != null && {
                    securityComplianceNotificationMails: org.securityComplianceNotificationMails
                }),
                ...(org.securityComplianceNotificationPhones != null && {
                    securityComplianceNotificationPhones: org.securityComplianceNotificationPhones
                }),
                ...(org.state != null && { state: org.state }),
                ...(org.technicalNotificationMails != null && {
                    technicalNotificationMails: org.technicalNotificationMails
                }),
                ...(org.verifiedDomains != null && {
                    verifiedDomains: org.verifiedDomains.map((domain) => ({
                        ...(domain.capabilities != null && {
                            capabilities: domain.capabilities
                        }),
                        ...(domain.isDefault != null && {
                            isDefault: domain.isDefault
                        }),
                        ...(domain.isInitial != null && {
                            isInitial: domain.isInitial
                        }),
                        ...(domain.name != null && { name: domain.name }),
                        ...(domain.type != null && { type: domain.type })
                    }))
                })
            }));

            if (mappedOrganizations.length > 0) {
                await nango.batchSave(mappedOrganizations, 'Organization');
            }

            if (parsed['@odata.nextLink']) {
                currentEndpoint = extractPathFromUrl(parsed['@odata.nextLink']);
                await nango.saveCheckpoint({ nextLink: parsed['@odata.nextLink'] });
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Organization');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
