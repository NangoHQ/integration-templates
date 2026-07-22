import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderDeploymentSchema = z
    .object({
        uid: z.string(),
        name: z.string(),
        url: z.string().nullable().optional(),
        created: z.number(),
        createdAt: z.number().optional(),
        creator: z.record(z.string(), z.unknown()).optional(),
        inspectorUrl: z.string().nullable().optional(),
        projectId: z.string(),
        readyState: z.string(),
        type: z.string().optional(),
        target: z.string().nullable().optional(),
        state: z.string().optional(),
        source: z.string().optional(),
        buildingAt: z.number().optional(),
        ready: z.number().optional(),
        deleted: z.number().optional(),
        undeleted: z.number().optional(),
        softDeletedByRetention: z.boolean().optional(),
        readySubstate: z.string().optional(),
        checksState: z.string().optional(),
        checksConclusion: z.string().optional(),
        errorCode: z.string().optional(),
        errorMessage: z.string().nullable().optional(),
        oomReport: z.string().optional(),
        isRollbackCandidate: z.boolean().nullable().optional(),
        prebuilt: z.boolean().optional(),
        expiration: z.number().optional(),
        proposedExpiration: z.number().optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
        projectSettings: z.record(z.string(), z.unknown()).optional(),
        checks: z.record(z.string(), z.unknown()).optional(),
        manualProvisioning: z.record(z.string(), z.unknown()).optional(),
        platform: z.record(z.string(), z.unknown()).optional(),
        customEnvironment: z.record(z.string(), z.unknown()).optional(),
        seatBlock: z.record(z.string(), z.unknown()).optional(),
        attribution: z.record(z.string(), z.unknown()).optional(),
        connectBuildsEnabled: z.boolean().optional(),
        connectConfigurationId: z.string().optional(),
        passiveConnectConfigurationId: z.string().optional()
    })
    .passthrough();

const DeploymentSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        url: z.string().optional(),
        created: z.number(),
        createdAt: z.number().optional(),
        creator: z.record(z.string(), z.unknown()).optional(),
        inspectorUrl: z.string().optional(),
        projectId: z.string(),
        readyState: z.string(),
        type: z.string().optional(),
        target: z.string().optional(),
        state: z.string().optional(),
        source: z.string().optional(),
        buildingAt: z.number().optional(),
        ready: z.number().optional(),
        deleted: z.number().optional(),
        undeleted: z.number().optional(),
        softDeletedByRetention: z.boolean().optional(),
        readySubstate: z.string().optional(),
        checksState: z.string().optional(),
        checksConclusion: z.string().optional(),
        errorCode: z.string().optional(),
        errorMessage: z.string().optional(),
        oomReport: z.string().optional(),
        isRollbackCandidate: z.boolean().optional(),
        prebuilt: z.boolean().optional(),
        expiration: z.number().optional(),
        proposedExpiration: z.number().optional(),
        meta: z.record(z.string(), z.unknown()).optional(),
        projectSettings: z.record(z.string(), z.unknown()).optional(),
        checks: z.record(z.string(), z.unknown()).optional(),
        manualProvisioning: z.record(z.string(), z.unknown()).optional(),
        platform: z.record(z.string(), z.unknown()).optional(),
        customEnvironment: z.record(z.string(), z.unknown()).optional(),
        seatBlock: z.record(z.string(), z.unknown()).optional(),
        attribution: z.record(z.string(), z.unknown()).optional(),
        connectBuildsEnabled: z.boolean().optional(),
        connectConfigurationId: z.string().optional(),
        passiveConnectConfigurationId: z.string().optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    until: z.number()
});

// `pagination` and `pagination.next` are required (next is nullable, not optional): Vercel
// signals "no more pages" via `next: null`, not by omitting the field or the whole object.
// If a response is missing pagination info entirely, parsing must fail loudly instead of
// silently being treated as the last page, which would close out trackDeletesEnd() based on
// an incomplete crawl.
const DeploymentListResponseSchema = z.object({
    deployments: z.array(ProviderDeploymentSchema),
    pagination: z.object({
        next: z.number().nullable()
    })
});

const sync = createSync({
    description: 'Sync deployments.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Deployment: DeploymentSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let until = checkpoint?.until;

        // Blocker: /v6/deployments paginates by creation-time cursors, but it does not
        // expose an updated-since filter that would safely cover deployment state
        // changes or deletions. Keep this as a full snapshot and use the cursor only
        // to resume an interrupted crawl.
        await nango.trackDeletesStart('Deployment');

        const proxyConfig: ProxyConfiguration = {
            // https://vercel.com/docs/rest-api/deployments/list-deployments
            endpoint: '/v6/deployments',
            params: {
                limit: 100,
                ...(until !== undefined && { until })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'until',
                cursor_path_in_response: 'pagination.next',
                response_path: 'deployments',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    // Validate the full raw response (not just the extracted `deployments`
                    // page) so a malformed/truncated response missing `pagination` throws
                    // instead of silently being treated as "no more pages".
                    const parsedPage = DeploymentListResponseSchema.safeParse(response.data);
                    if (!parsedPage.success) {
                        throw new Error(`Failed to parse deployments response: ${parsedPage.error.message}`);
                    }
                    until = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderDeploymentSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse deployments response: ${parsed.error.message}`);
            }

            const deployments = parsed.data.map((data) => ({
                id: data.uid,
                name: data.name,
                url: data.url ?? undefined,
                created: data.created,
                createdAt: data.createdAt,
                creator: data.creator,
                inspectorUrl: data.inspectorUrl ?? undefined,
                projectId: data.projectId,
                readyState: data.readyState,
                type: data.type,
                target: data.target ?? undefined,
                state: data.state,
                source: data.source,
                buildingAt: data.buildingAt,
                ready: data.ready,
                deleted: data.deleted,
                undeleted: data.undeleted,
                softDeletedByRetention: data.softDeletedByRetention,
                readySubstate: data.readySubstate,
                checksState: data.checksState,
                checksConclusion: data.checksConclusion,
                errorCode: data.errorCode,
                errorMessage: data.errorMessage ?? undefined,
                oomReport: data.oomReport,
                isRollbackCandidate: data.isRollbackCandidate ?? undefined,
                prebuilt: data.prebuilt,
                expiration: data.expiration,
                proposedExpiration: data.proposedExpiration,
                meta: data.meta,
                projectSettings: data.projectSettings,
                checks: data.checks,
                manualProvisioning: data.manualProvisioning,
                platform: data.platform,
                customEnvironment: data.customEnvironment,
                seatBlock: data.seatBlock,
                attribution: data.attribution,
                connectBuildsEnabled: data.connectBuildsEnabled,
                connectConfigurationId: data.connectConfigurationId,
                passiveConnectConfigurationId: data.passiveConnectConfigurationId
            }));

            if (deployments.length > 0) {
                await nango.batchSave(deployments, 'Deployment');
            }

            if (until !== undefined) {
                await nango.saveCheckpoint({ until });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Deployment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
