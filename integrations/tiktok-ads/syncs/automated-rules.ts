import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    advertiser_id: z.string()
});

const AutomatedRuleSchema = z
    .object({
        id: z.string(),
        rule_id: z.string().optional(),
        name: z.string().optional(),
        status: z.string().optional(),
        data_dimension: z.string().optional(),
        actions: z.array(z.record(z.string(), z.unknown())).optional(),
        apply_objects: z.array(z.record(z.string(), z.unknown())).optional(),
        conditions: z.array(z.record(z.string(), z.unknown())).optional(),
        notification: z.record(z.string(), z.unknown()).optional(),
        rule_exec_info: z.record(z.string(), z.unknown()).optional(),
        tzone: z.string().optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync automated budget and bid management rules from TikTok Ads',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/automated-rules'
        }
    ],
    models: {
        AutomatedRule: AutomatedRuleSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();

        if (!metadata?.advertiser_id) {
            throw new Error('advertiser_id is required in metadata');
        }

        await nango.trackDeletesStart('AutomatedRule');

        // https://business-api.tiktok.com/portal/docs?id=1738768861976578
        const proxyConfig: ProxyConfiguration = {
            // https://business-api.tiktok.com/portal/docs?id=1738768861976578
            endpoint: 'optimizer/rule/list/',
            params: {
                advertiser_id: metadata.advertiser_id
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'page_size',
                limit: 100,
                response_path: 'data.list'
            },
            retries: 3
        };

        for await (const page of nango.paginate<unknown>(proxyConfig)) {
            const rules = page.map((item) => {
                const raw = z.object({ rule_id: z.string() }).passthrough().parse(item);

                return {
                    ...raw,
                    id: raw.rule_id
                };
            });

            if (rules.length > 0) {
                await nango.batchSave(rules, 'AutomatedRule');
            }
        }

        await nango.trackDeletesEnd('AutomatedRule');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
