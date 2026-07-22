import { createSync } from 'nango';
import { z } from 'zod';

const ProviderCreatorSchema = z.object({
    email: z.string(),
    uid: z.string(),
    username: z.string()
});

const ProviderDeploymentSchema = z.object({
    id: z.string(),
    url: z.string()
});

const ProviderAliasSchema = z.object({
    uid: z.string(),
    alias: z.string(),
    created: z.string().optional(),
    createdAt: z.number().optional(),
    creator: ProviderCreatorSchema.optional(),
    deletedAt: z.number().nullable().optional(),
    deployment: ProviderDeploymentSchema.optional(),
    deploymentId: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
    redirect: z.string().nullable().optional(),
    redirectStatusCode: z.number().nullable().optional(),
    updatedAt: z.number().optional(),
    protectionBypass: z.record(z.string(), z.unknown()).optional(),
    microfrontends: z.record(z.string(), z.unknown()).optional()
});

const AliasListResponseSchema = z.object({
    aliases: z.array(ProviderAliasSchema),
    pagination: z
        .object({
            next: z.number().nullable().optional()
        })
        .optional()
});

const AliasSchema = z.object({
    id: z.string(),
    alias: z.string(),
    deploymentId: z.string().optional(),
    projectId: z.string().optional(),
    created: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    deletedAt: z.number().optional(),
    redirect: z.string().optional(),
    redirectStatusCode: z.number().optional()
});

const CheckpointSchema = z.object({
    until: z.number()
});

const sync = createSync({
    description: 'Sync deployment aliases across the team.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Alias: AliasSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let until = checkpoint?.until;

        // Blocker: /v4/aliases exposes creation-time pagination but no updated-since
        // filter or deleted-record feed, so this remains a full snapshot sync.
        // Persist the provider cursor only to resume an interrupted crawl.

        await nango.trackDeletesStart('Alias');

        while (true) {
            // https://vercel.com/docs/rest-api/reference/endpoints/aliases/list-aliases
            const response = await nango.get({
                endpoint: '/v4/aliases',
                params: {
                    limit: 100,
                    ...(until !== undefined && { until })
                },
                retries: 3
            });

            const parsed = AliasListResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse aliases response: ${parsed.error.message}`);
            }

            const aliases = parsed.data.aliases.map((alias) => ({
                id: alias.uid,
                alias: alias.alias,
                ...(alias.deploymentId != null && { deploymentId: alias.deploymentId }),
                ...(alias.projectId != null && { projectId: alias.projectId }),
                ...(alias.created != null && { created: alias.created }),
                ...(alias.createdAt != null && { createdAt: alias.createdAt }),
                ...(alias.updatedAt != null && { updatedAt: alias.updatedAt }),
                ...(alias.deletedAt != null && { deletedAt: alias.deletedAt }),
                ...(alias.redirect != null && { redirect: alias.redirect }),
                ...(alias.redirectStatusCode != null && { redirectStatusCode: alias.redirectStatusCode })
            }));

            if (aliases.length > 0) {
                await nango.batchSave(aliases, 'Alias');
            }

            const nextUntil = parsed.data.pagination?.next ?? undefined;
            if (nextUntil === undefined) {
                break;
            }

            until = nextUntil;
            await nango.saveCheckpoint({ until });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Alias');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
