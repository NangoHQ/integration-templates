import { createSync, type ProxyConfiguration } from 'nango';
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

// `pagination` and `pagination.next` are required (next is nullable, not optional): Vercel
// signals "no more pages" via `next: null`, not by omitting the field or the whole object.
// If a response is missing pagination info entirely, parsing must fail loudly instead of
// silently being treated as the last page, which would close out trackDeletesEnd() based on
// an incomplete crawl.
const AliasListResponseSchema = z.object({
    aliases: z.array(ProviderAliasSchema),
    pagination: z.object({
        next: z.number().nullable()
    })
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

        const proxyConfig: ProxyConfiguration = {
            // https://vercel.com/docs/rest-api/reference/endpoints/aliases/list-aliases
            endpoint: '/v4/aliases',
            params: {
                limit: 100,
                ...(until !== undefined && { until })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'until',
                cursor_path_in_response: 'pagination.next',
                response_path: 'aliases',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam, response }) => {
                    // Validate the full raw response (not just the extracted `aliases` page)
                    // so a malformed/truncated response missing `pagination` throws instead
                    // of silently being treated as "no more pages".
                    const parsedPage = AliasListResponseSchema.safeParse(response.data);
                    if (!parsedPage.success) {
                        throw new Error(`Failed to parse aliases response: ${parsedPage.error.message}`);
                    }
                    until = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderAliasSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse aliases response: ${parsed.error.message}`);
            }

            const aliases = parsed.data.map((alias) => ({
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

            if (until !== undefined) {
                await nango.saveCheckpoint({ until });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Alias');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
