import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    indexName: z.string()
});

const CheckpointSchema = z.object({
    indexName: z.string(),
    page: z.number().int().nonnegative()
});

const AlgoliaRuleSchema = z.object({
    objectID: z.string(),
    conditions: z.array(z.record(z.string(), z.unknown())).optional(),
    consequence: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    validity: z.array(z.record(z.string(), z.unknown())).optional()
});

const RuleSchema = z.object({
    id: z.string(),
    objectID: z.string(),
    conditions: z.array(z.record(z.string(), z.unknown())).optional(),
    consequence: z.record(z.string(), z.unknown()).optional(),
    description: z.string().optional(),
    enabled: z.boolean().optional(),
    validity: z.array(z.record(z.string(), z.unknown())).optional()
});

const sync = createSync({
    description: 'Sync query rules from an Algolia index',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/rules'
        }
    ],
    models: {
        Rule: RuleSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error('indexName is required in metadata');
        }
        const indexName = metadataResult.data.indexName;
        const checkpoint = await nango.getCheckpoint();
        const startPage = checkpoint?.indexName === indexName ? (checkpoint.page ?? 0) : 0;

        if (checkpoint && checkpoint.indexName !== indexName) {
            await nango.clearCheckpoint();
        }

        // Blocker: Algolia rules search has no changed-since or deleted-rule
        // endpoint. We checkpoint the current page so a full refresh can resume
        // after an interruption. Delete tracking is only safe on a full run
        // because a resumed run skips earlier pages whose records would be
        // falsely deleted by trackDeletesEnd.
        const isFullRun = startPage === 0;
        if (isFullRun) {
            await nango.trackDeletesStart('Rule');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.algolia.com/doc/rest-api/search/#tag/Rules/operation/searchRules
            endpoint: `/1/indexes/${encodeURIComponent(indexName)}/rules/search`,
            method: 'POST',
            data: {},
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_calculation_method: 'per-page',
                offset_start_value: startPage,
                limit_name_in_request: 'hitsPerPage',
                limit: 100,
                response_path: 'hits',
                on_page: async ({ nextPageParam }) => {
                    if (typeof nextPageParam === 'number') {
                        await nango.saveCheckpoint({
                            indexName,
                            page: nextPageParam
                        });
                    }
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedPage = z.array(z.unknown()).safeParse(page);
            if (!parsedPage.success) {
                throw new Error('Invalid rules page: expected array of objects');
            }

            const rules = [];
            for (const item of parsedPage.data) {
                const parsedRule = AlgoliaRuleSchema.safeParse(item);
                if (!parsedRule.success) {
                    throw new Error('Invalid rule object: missing objectID');
                }
                const rule = parsedRule.data;
                rules.push({
                    id: rule.objectID,
                    objectID: rule.objectID,
                    ...(rule.conditions !== undefined && { conditions: rule.conditions }),
                    ...(rule.consequence !== undefined && { consequence: rule.consequence }),
                    ...(rule.description !== undefined && { description: rule.description }),
                    ...(rule.enabled !== undefined && { enabled: rule.enabled }),
                    ...(rule.validity !== undefined && { validity: rule.validity })
                });
            }

            if (rules.length > 0) {
                await nango.batchSave(rules, 'Rule');
            }
        }

        await nango.clearCheckpoint();
        if (isFullRun) {
            await nango.trackDeletesEnd('Rule');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
