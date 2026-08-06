import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const DealSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    summary: z.string().optional(),
    value: z.number().optional(),
    status: z.number().optional(),
    deal_stage_id: z.number().optional(),
    owner_id: z.number().optional(),
    company_id: z.number().optional(),
    primary_contact_id: z.number().optional(),
    probability: z.number().optional(),
    expected_close_date: z.string().optional(),
    closed_time: z.string().optional(),
    created_at: z.string(),
    updated_at: z.string(),
    currency_code: z.string().optional(),
    deal_stage_name: z.string().optional(),
    company_name: z.string().optional(),
    owner_name: z.string().optional(),
    is_archived: z.boolean().optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    last_full_sync: z.string()
});

const FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

const RawDealSchema = z.object({
    id: z.number(),
    name: z.string().nullish(),
    summary: z.string().nullish(),
    value: z.union([z.number(), z.string()]).nullish(),
    status: z.number().nullish(),
    deal_stage_id: z.number().nullish(),
    user_id: z.number().nullish(),
    company_id: z.number().nullish(),
    primary_contact_id: z.number().nullish(),
    probability: z.number().nullish(),
    expected_close_date: z.string().nullish(),
    closed_time: z.string().nullish(),
    created_at: z.string(),
    updated_at: z.string(),
    is_archived: z.boolean().nullish(),
    currency: z
        .object({
            code: z.string().nullish()
        })
        .nullish(),
    deal_stage: z
        .object({
            name: z.string().nullish()
        })
        .nullish(),
    company: z
        .object({
            name: z.string().nullish()
        })
        .nullish(),
    user: z
        .object({
            first_name: z.string().nullish(),
            last_name: z.string().nullish()
        })
        .nullish(),
    custom_fields: z.record(z.string(), z.unknown()).nullish()
});

const sync = createSync({
    description: 'Sync deals in this account.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Deal: DealSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        const updatedAfter = checkpointResult.success ? checkpointResult.data.updated_after : undefined;
        const isFirstRun = updatedAfter === undefined;
        const syncStartTime = new Date()
            .toISOString()
            .replace('T', ' ')
            .replace(/\.\d+Z$/, '');

        // Incremental runs only fetch deals modified since the last checkpoint, so deals deleted
        // in Pipeline in between never show up in an incremental page. Periodically fall back to a
        // full, unfiltered enumeration bracketed by delete-tracking so deletions are eventually caught.
        const lastFullSync = checkpointResult.success ? new Date(checkpointResult.data.last_full_sync).getTime() : NaN;
        const isFullSync = isFirstRun || isNaN(lastFullSync) || Date.now() - lastFullSync >= FULL_SYNC_INTERVAL_MS;

        if (isFullSync) {
            await nango.trackDeletesStart('Deal');
        }

        const params: Record<string, string | number> = {
            page: 1,
            per_page: 200
        };

        if (updatedAfter && !isFullSync) {
            params['conditions%5Bdeal_modified%5D%5Bfrom_date%5D'] = updatedAfter;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: '/api/v3/deals',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 200,
                response_path: 'entries'
            },
            retries: 3
        };

        for await (const entries of nango.paginate(proxyConfig)) {
            const parsed = z.array(z.unknown()).safeParse(entries);

            if (!parsed.success) {
                throw new Error(`Failed to parse deals page: ${parsed.error.message}`);
            }

            const deals = parsed.data.map((raw) => {
                const deal = RawDealSchema.safeParse(raw);

                if (!deal.success) {
                    throw new Error(`Failed to parse deal: ${deal.error.message}`);
                }

                const d = deal.data;

                const value = d.value !== null && d.value !== undefined ? (typeof d.value === 'string' ? parseFloat(d.value) : d.value) : undefined;

                return {
                    id: String(d.id),
                    name: d.name ?? undefined,
                    summary: d.summary ?? undefined,
                    value: value,
                    status: d.status ?? undefined,
                    deal_stage_id: d.deal_stage_id ?? undefined,
                    owner_id: d.user_id ?? undefined,
                    company_id: d.company_id ?? undefined,
                    primary_contact_id: d.primary_contact_id ?? undefined,
                    probability: d.probability ?? undefined,
                    expected_close_date: d.expected_close_date ?? undefined,
                    closed_time: d.closed_time ?? undefined,
                    created_at: d.created_at,
                    updated_at: d.updated_at,
                    is_archived: d.is_archived ?? undefined,
                    currency_code: d.currency?.code ?? undefined,
                    deal_stage_name: d.deal_stage?.name ?? undefined,
                    company_name: d.company?.name ?? undefined,
                    owner_name: [d.user?.first_name, d.user?.last_name].filter(Boolean).join(' ') || undefined,
                    custom_fields: d.custom_fields ?? undefined
                };
            });

            if (deals.length === 0) {
                continue;
            }

            await nango.batchSave(deals, 'Deal');
        }

        if (isFullSync) {
            await nango.trackDeletesEnd('Deal');
        }

        await nango.saveCheckpoint({
            updated_after: syncStartTime,
            last_full_sync: isFullSync ? syncStartTime : new Date(lastFullSync).toISOString()
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
