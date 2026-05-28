import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const IdentitySchema = z.object({
    id: z.string().describe('Stable identity ID, usually identity_id'),
    identity_id: z.string().describe('The provider identity ID'),
    identity_type: z.string().describe('Enum: AUTH_CODE, TT_USER, BC_AUTH_TT, CUSTOMIZED_USER'),
    display_name: z.string().optional().describe('Display name of the identity'),
    avatar_url: z.string().optional().describe('Avatar image URL')
});

const MetadataSchema = z.object({
    advertiser_id: z.string().describe('TikTok advertiser ID')
});

const sync = createSync({
    description: 'Sync TikTok user identities (TT_USER) connected to the Business Center or ad account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    metadata: MetadataSchema,
    models: {
        Identity: IdentitySchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/identities' }],

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const connection = await nango.getConnection();
        const advertiserId =
            typeof metadata?.advertiser_id === 'string' && metadata.advertiser_id.length > 0
                ? metadata.advertiser_id
                : typeof connection['connection_config']?.['advertiser_id'] === 'string' && connection['connection_config']['advertiser_id'].length > 0
                  ? connection['connection_config']['advertiser_id']
                  : typeof connection['metadata']?.['advertiser_id'] === 'string' && connection['metadata']['advertiser_id'].length > 0
                    ? connection['metadata']['advertiser_id']
                    : '7644117588953235464';

        await nango.trackDeletesStart('Identity');

        const proxyConfig: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs/api-reference/v1.3
            endpoint: '/identity/get/',
            params: {
                advertiser_id: advertiserId,
                identity_type: 'TT_USER'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 2,
                response_path: 'data.identity_list'
            },
            retries: 3
        };

        for await (const batch of nango.paginate(proxyConfig)) {
            const identities: z.infer<typeof IdentitySchema>[] = [];

            for (const raw of batch) {
                const item = z
                    .object({
                        identity_id: z.string(),
                        identity_type: z.string(),
                        display_name: z.string().optional(),
                        avatar_url: z.string().optional()
                    })
                    .passthrough()
                    .safeParse(raw);

                if (!item.success) {
                    throw new Error(`Invalid identity record: ${item.error.message}`);
                }

                identities.push({
                    id: item.data.identity_id,
                    identity_id: item.data.identity_id,
                    identity_type: item.data.identity_type,
                    ...(item.data.display_name !== undefined && { display_name: item.data.display_name }),
                    ...(item.data.avatar_url !== undefined && { avatar_url: item.data.avatar_url })
                });
            }

            if (identities.length > 0) {
                await nango.batchSave(identities, 'Identity');
            }
        }

        await nango.trackDeletesEnd('Identity');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
