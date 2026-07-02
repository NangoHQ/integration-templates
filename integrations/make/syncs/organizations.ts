import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string().optional(),
    serviceName: z.string().optional(),
    nextReset: z.string().optional(),
    lastReset: z.string().optional(),
    isPaused: z.boolean().optional(),
    countryId: z.number().optional(),
    timezoneId: z.number().optional(),
    deleted: z.boolean().optional(),
    zone: z.string().optional(),
    teams: z.array(z.object({ id: z.number(), name: z.string() }).passthrough()).optional(),
    productName: z.string().optional(),
    ssoType: z.string().optional(),
    scenarios: z.number().optional(),
    activeScenarios: z.number().optional(),
    tfaEnforced: z.boolean().optional()
});

const ProviderOrganizationSchema = z.object({
    id: z.number(),
    name: z.string(),
    createdAt: z.string().optional(),
    serviceName: z.string().optional(),
    nextReset: z.string().optional(),
    lastReset: z.string().optional(),
    isPaused: z.boolean().optional(),
    countryId: z.number().optional(),
    timezoneId: z.number().optional(),
    deleted: z.boolean().optional(),
    license: z.unknown().optional(),
    zone: z.string().optional(),
    teams: z.array(z.object({ id: z.number(), name: z.string() }).passthrough()).optional(),
    productName: z.string().optional(),
    ssoType: z.string().nullable().optional(),
    scenarios: z.number().optional(),
    activeScenarios: z.number().optional(),
    tfaEnforced: z.boolean().optional()
});

const sync = createSync({
    description: "Sync organizations the API token's user belongs to.",
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Organization: OrganizationSchema
    },

    exec: async (nango) => {
        // Blocker: GET /organizations does not support updated_since, modified_after,
        // or any resumable cursor. It returns a full snapshot with no incremental filters.
        await nango.trackDeletesStart('Organization');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/api-reference/organizations.md
            endpoint: '/organizations',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'pg[offset]',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'pg[limit]',
                limit: 1000,
                response_path: 'organizations'
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const parsed = z.array(ProviderOrganizationSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse organizations page: ${parsed.error.message}`);
            }

            const organizations = parsed.data.map((org) => ({
                id: String(org.id),
                name: org.name,
                ...(org.createdAt !== undefined && { createdAt: org.createdAt }),
                ...(org.serviceName !== undefined && { serviceName: org.serviceName }),
                ...(org.nextReset !== undefined && { nextReset: org.nextReset }),
                ...(org.lastReset !== undefined && { lastReset: org.lastReset }),
                ...(org.isPaused !== undefined && { isPaused: org.isPaused }),
                ...(org.countryId !== undefined && { countryId: org.countryId }),
                ...(org.timezoneId !== undefined && { timezoneId: org.timezoneId }),
                ...(org.deleted !== undefined && { deleted: org.deleted }),
                ...(org.zone !== undefined && { zone: org.zone }),
                ...(org.teams !== undefined && { teams: org.teams }),
                ...(org.productName !== undefined && { productName: org.productName }),
                ...(org.ssoType != null && { ssoType: org.ssoType }),
                ...(org.scenarios !== undefined && { scenarios: org.scenarios }),
                ...(org.activeScenarios !== undefined && { activeScenarios: org.activeScenarios }),
                ...(org.tfaEnforced !== undefined && { tfaEnforced: org.tfaEnforced })
            }));

            if (organizations.length > 0) {
                await nango.batchSave(organizations, 'Organization');
            }
        }

        await nango.trackDeletesEnd('Organization');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
