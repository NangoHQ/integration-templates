import { createSync } from 'nango';
import { z } from 'zod';

const KpiDefinitionSchema = z
    .object({
        _id: z.string(),
        title: z.string().optional(),
        unit: z.string().optional(),
        goal: z.string().optional().nullable(),
        teamId: z.string().optional().nullable(),
        scorecardId: z.string().optional().nullable(),
        companyId: z.string().optional().nullable(),
        interval: z.string().optional(),
        createdDate: z.string().optional(),
        createdByUserId: z.string().optional().nullable()
    })
    .passthrough();

const ScorecardKpiSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    unit: z.string().optional(),
    goal: z.string().optional(),
    teamId: z.string().optional(),
    scorecardId: z.string().optional(),
    companyId: z.string().optional(),
    interval: z.string().optional(),
    createdDate: z.string().optional(),
    createdByUserId: z.string().optional()
});

const PaginatedScorecardKpisResponseSchema = z.object({
    currentPage: z.number(),
    items: z.array(KpiDefinitionSchema),
    itemsCount: z.number(),
    totalCount: z.number(),
    totalPages: z.number()
});

const CheckpointSchema = z.object({
    nextPageIndex: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync scorecard measurable (KPI) definitions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ScorecardKpi: ScorecardKpiSchema
    },

    exec: async (nango) => {
        // Provider limitation: no modified-timestamp field on KPI definitions,
        // no changed-since filter, and no deleted-record endpoint. This stays a
        // full refresh, but pageIndex/pageSize let us checkpoint full-refresh
        // progress so interrupted runs resume from the next page.
        const checkpoint = await nango.getCheckpoint();
        let hasCheckpoint = checkpoint != null;

        await nango.trackDeletesStart('ScorecardKpi');

        let pageIndex = checkpoint?.nextPageIndex ?? 0;
        const pageSize = 100;

        while (true) {
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            const response = await nango.post({
                endpoint: '/v1/scorecard/kpis/query',
                data: {
                    pageIndex,
                    pageSize
                },
                retries: 3
            });

            const parsed = PaginatedScorecardKpisResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse KPI definitions response: ${parsed.error.message}`);
            }

            const { items, totalCount } = parsed.data;
            if (items.length === 0) {
                break;
            }

            const kpis = [];
            for (const record of items) {
                kpis.push({
                    id: record._id,
                    ...(record.title != null && { title: record.title }),
                    ...(record.unit != null && { unit: record.unit }),
                    ...(record.goal != null && { goal: record.goal }),
                    ...(record.teamId != null && { teamId: record.teamId }),
                    ...(record.scorecardId != null && { scorecardId: record.scorecardId }),
                    ...(record.companyId != null && { companyId: record.companyId }),
                    ...(record.interval != null && { interval: record.interval }),
                    ...(record.createdDate != null && { createdDate: record.createdDate }),
                    ...(record.createdByUserId != null && { createdByUserId: record.createdByUserId })
                });
            }

            if (kpis.length > 0) {
                await nango.batchSave(kpis, 'ScorecardKpi');
            }

            const nextPageIndex = pageIndex + 1;
            if (nextPageIndex * pageSize < totalCount) {
                await nango.saveCheckpoint({ nextPageIndex });
                hasCheckpoint = true;
            }

            pageIndex = nextPageIndex;
        }

        if (hasCheckpoint) {
            await nango.clearCheckpoint();
        }

        await nango.trackDeletesEnd('ScorecardKpi');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
