import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AdminSetStateSchema = z.object({
    enabled: z.boolean().optional(),
    timestamp: z.string().optional()
});

const ProviderEndpointSchema = z.object({
    adminSetState: AdminSetStateSchema.optional(),
    agentUUID: z.string().optional(),
    userUUID: z.string().optional(),
    agentVersion: z.string().optional(),
    binaryType: z.string().optional(),
    cityName: z.string().optional(),
    region: z.string().optional(),
    countryName: z.string().optional(),
    cpuFamily: z.string().optional(),
    debugState: z.string().optional(),
    deviceName: z.string().optional(),
    disableMode: z.boolean().optional(),
    errorMessage: z.string().optional(),
    fallbackMode: z.boolean().optional(),
    configurationLastUpdated: z.string().optional(),
    osVersion: z.string().optional(),
    policyName: z.string().optional(),
    realtimeConnection: z.boolean().optional(),
    status: z.string().optional(),
    lastSeen: z.string().optional(),
    userId: z.string().optional(),
    emailId: z.string().optional()
});

const PageInfoSchema = z.object({
    endCursor: z.string().nullable().optional(),
    hasNextPage: z.boolean()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        pageInfo: PageInfoSchema,
        endpoints: z.array(ProviderEndpointSchema)
    })
});

const EndpointSchema = z.object({
    id: z.string(),
    adminSetState: AdminSetStateSchema.optional(),
    agentUUID: z.string().optional(),
    userUUID: z.string().optional(),
    agentVersion: z.string().optional(),
    binaryType: z.string().optional(),
    cityName: z.string().optional(),
    region: z.string().optional(),
    countryName: z.string().optional(),
    cpuFamily: z.string().optional(),
    debugState: z.string().optional(),
    deviceName: z.string().optional(),
    disableMode: z.boolean().optional(),
    errorMessage: z.string().optional(),
    fallbackMode: z.boolean().optional(),
    configurationLastUpdated: z.string().optional(),
    osVersion: z.string().optional(),
    policyName: z.string().optional(),
    realtimeConnection: z.boolean().optional(),
    status: z.string().optional(),
    lastSeen: z.string().optional(),
    userId: z.string().optional(),
    emailId: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync endpoints (managed devices)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Endpoint: EndpointSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let after = typeof checkpoint?.['cursor'] === 'string' ? checkpoint['cursor'] : undefined;

        // /v1/endpoints/search is ordered by lastSeen, but deletions are only
        // observable by comparing a full crawl against the previous cache state.
        // Keep a full refresh with delete tracking, and use the cursor checkpoint
        // only to resume an interrupted crawl.
        await nango.trackDeletesStart('Endpoint');

        while (true) {
            const params: Record<string, string | number> = {
                first: 100,
                order: 'desc'
            };
            if (after !== undefined) {
                params['after'] = after;
            }

            const config: ProxyConfiguration = {
                // https://inflight.dope.security/dope.apis/public-api-specification
                endpoint: '/v1/endpoints/search',
                params,
                retries: 3
            };

            const response = await nango.get(config);

            const parsed = ProviderResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse endpoints response: ${parsed.error.message}`);
            }

            const { endpoints, pageInfo } = parsed.data.data;

            const mapped = endpoints.map((record) => ({
                id: record.agentUUID ?? `${record.deviceName ?? 'unknown'}-${record.userId ?? 'unknown'}`,
                ...(record.adminSetState !== undefined ? { adminSetState: record.adminSetState } : {}),
                ...(record.agentUUID !== undefined ? { agentUUID: record.agentUUID } : {}),
                ...(record.userUUID !== undefined ? { userUUID: record.userUUID } : {}),
                ...(record.agentVersion !== undefined ? { agentVersion: record.agentVersion } : {}),
                ...(record.binaryType !== undefined ? { binaryType: record.binaryType } : {}),
                ...(record.cityName !== undefined ? { cityName: record.cityName } : {}),
                ...(record.region !== undefined ? { region: record.region } : {}),
                ...(record.countryName !== undefined ? { countryName: record.countryName } : {}),
                ...(record.cpuFamily !== undefined ? { cpuFamily: record.cpuFamily } : {}),
                ...(record.debugState !== undefined ? { debugState: record.debugState } : {}),
                ...(record.deviceName !== undefined ? { deviceName: record.deviceName } : {}),
                ...(record.disableMode !== undefined ? { disableMode: record.disableMode } : {}),
                ...(record.errorMessage !== undefined ? { errorMessage: record.errorMessage } : {}),
                ...(record.fallbackMode !== undefined ? { fallbackMode: record.fallbackMode } : {}),
                ...(record.configurationLastUpdated !== undefined ? { configurationLastUpdated: record.configurationLastUpdated } : {}),
                ...(record.osVersion !== undefined ? { osVersion: record.osVersion } : {}),
                ...(record.policyName !== undefined ? { policyName: record.policyName } : {}),
                ...(record.realtimeConnection !== undefined ? { realtimeConnection: record.realtimeConnection } : {}),
                ...(record.status !== undefined ? { status: record.status } : {}),
                ...(record.lastSeen !== undefined ? { lastSeen: record.lastSeen } : {}),
                ...(record.userId !== undefined ? { userId: record.userId } : {}),
                ...(record.emailId !== undefined ? { emailId: record.emailId } : {})
            }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Endpoint');
            }

            if (!pageInfo.hasNextPage) {
                break;
            }

            if (pageInfo.endCursor == null) {
                throw new Error('Missing endpoint cursor for next page');
            }

            after = pageInfo.endCursor;
            await nango.saveCheckpoint({
                cursor: after
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Endpoint');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
