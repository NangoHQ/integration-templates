import { createSync } from 'nango';
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

const DeploymentListResponseSchema = z.object({
    deployments: z.array(ProviderDeploymentSchema),
    pagination: z
        .object({
            next: z.number().nullable().optional()
        })
        .optional()
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

        while (true) {
            // https://vercel.com/docs/rest-api/deployments/list-deployments
            const response = await nango.get({
                endpoint: '/v6/deployments',
                params: {
                    limit: 100,
                    ...(until !== undefined && { until })
                },
                retries: 3
            });

            const parsed = DeploymentListResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse deployments response: ${parsed.error.message}`);
            }

            const deployments = parsed.data.deployments.map((data) => ({
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

            const nextUntil = parsed.data.pagination?.next ?? undefined;
            if (nextUntil === undefined) {
                break;
            }

            until = nextUntil;
            await nango.saveCheckpoint({ until });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Deployment');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
