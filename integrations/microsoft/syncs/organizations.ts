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

const sync = createSync({
    description: 'Sync organizations from Microsoft',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
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
        await nango.trackDeletesStart('Organization');

        const proxyConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/organization-list
            endpoint: '/v1.0/organization',
            paginate: {
                type: 'link',
                link_path_in_response_body: '@odata.nextLink',
                response_path: 'value',
                limit_name_in_request: '$top',
                limit: 100
            },
            retries: 3
        };

        for await (const organizations of nango.paginate(proxyConfig)) {
            const mappedOrganizations = organizations.map(
                (org: {
                    id: string;
                    displayName?: string | null;
                    tenantType?: string | null;
                    createdDateTime?: string | null;
                    onPremisesLastSyncDateTime?: string | null;
                    onPremisesSyncEnabled?: boolean | null;
                    postType?: string | null;
                    preferredLanguage?: string | null;
                    privacyProfile?: {
                        contactEmail?: string | null;
                        statementUrl?: string | null;
                    } | null;
                    provisionedPlans?: Array<{
                        capabilityStatus?: string | null;
                        provisioningStatus?: string | null;
                        service?: string | null;
                    }> | null;
                    securityComplianceNotificationMails?: string[] | null;
                    securityComplianceNotificationPhones?: string[] | null;
                    state?: string | null;
                    technicalNotificationMails?: string[] | null;
                    verifiedDomains?: Array<{
                        capabilities?: string | null;
                        isDefault?: boolean | null;
                        isInitial?: boolean | null;
                        name?: string | null;
                        type?: string | null;
                    }> | null;
                }) => ({
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
                })
            );

            if (mappedOrganizations.length > 0) {
                await nango.batchSave(mappedOrganizations, 'Organization');
            }
        }

        await nango.trackDeletesEnd('Organization');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
