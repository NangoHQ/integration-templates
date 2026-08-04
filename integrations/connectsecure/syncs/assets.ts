import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const AssetSchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const CheckpointSchema = z.object({
    offset: z.number()
});

const RawAssetSchema = z
    .object({
        id: z.number().or(z.string())
    })
    .passthrough();

const ConnectionSchema = z
    .object({
        connection_config: z
            .object({
                tenant: z.string()
            })
            .optional()
    })
    .passthrough();

const AuthorizeResponseSchema = z
    .object({
        access_token: z.string().optional(),
        user_id: z.union([z.string(), z.number()]).optional(),
        data: z
            .object({
                access_token: z.string().optional(),
                user_id: z.union([z.string(), z.number()]).optional()
            })
            .optional()
    })
    .transform((val) => ({
        access_token: val.access_token ?? val.data?.access_token,
        user_id: val.user_id !== undefined ? String(val.user_id) : val.data?.user_id !== undefined ? String(val.data.user_id) : undefined
    }))
    .refine((val): val is { access_token: string; user_id: string } => typeof val.access_token === 'string' && typeof val.user_id === 'string', {
        message: 'Authorize response missing access_token or user_id'
    });

const MetadataTenantSchema = z.object({
    tenant: z.string()
});

const sync = createSync({
    description: 'Sync discovered assets (endpoints/devices) across this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Asset: AssetSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        // Full refresh with delete tracking: unconditionally reset pagination cursor to start from page 1.
        let offset: number | undefined = checkpoint?.offset;
        offset = undefined;

        const connection = ConnectionSchema.parse(await nango.getConnection());
        let tenant: string | undefined = connection.connection_config?.tenant;

        if (typeof tenant !== 'string') {
            const metadata = await nango.getMetadata();
            const metadataParsed = MetadataTenantSchema.safeParse(metadata);
            if (metadataParsed.success) {
                tenant = metadataParsed.data.tenant;
            }
        }

        if (typeof tenant !== 'string') {
            throw new Error('tenant is required in connection config or metadata');
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });
        const authParsed = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!authParsed.success) {
            throw new Error('Failed to obtain access_token or user_id from /w/authorize');
        }
        const accessToken = authParsed.data.access_token;
        const userId = authParsed.data.user_id;

        await nango.trackDeletesStart('Asset');

        const proxyConfig: ProxyConfiguration = {
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/asset/assets',
            headers: {
                Authorization: 'Bearer ' + accessToken,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_start_value: 0,
                limit_name_in_request: 'limit',
                limit: 5000,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const assets = page.map((raw: unknown) => {
                const parsed = RawAssetSchema.parse(raw);
                const record: Record<string, unknown> = parsed;
                return {
                    ...record,
                    id: String(parsed.id)
                };
            });

            if (assets.length > 0) {
                await nango.batchSave(assets, 'Asset');
                offset = (offset ?? 0) + assets.length;
                await nango.saveCheckpoint({ offset });
            }
        }

        await nango.trackDeletesEnd('Asset');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
