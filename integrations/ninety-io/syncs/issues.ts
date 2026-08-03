import { createSync } from 'nango';
import { z } from 'zod';

const ProviderIssueSchema = z.object({
    _id: z.string(),
    userId: z.string(),
    teamId: z.string(),
    companyId: z.string(),
    archived: z.boolean(),
    archivedDate: z.string().nullable().optional(),
    completed: z.boolean(),
    completedDate: z.string().nullable().optional(),
    createdBy: z.string(),
    deleted: z.boolean(),
    description: z.string().nullable().optional(),
    intervalCode: z.string().nullable().optional(),
    priority: z.number().nullable().optional(),
    title: z.string(),
    createdDate: z.string(),
    updatedDate: z.string().nullable().optional()
});

const PaginatedIssuesResponseSchema = z.object({
    items: z.array(ProviderIssueSchema),
    totalCount: z.number()
});

const IssueSchema = z.object({
    id: z.string(),
    userId: z.string(),
    teamId: z.string(),
    companyId: z.string(),
    archived: z.boolean(),
    archivedDate: z.string().optional(),
    completed: z.boolean(),
    completedDate: z.string().optional(),
    createdBy: z.string(),
    deleted: z.boolean(),
    description: z.string().optional(),
    intervalCode: z.string().optional(),
    priority: z.number().optional(),
    title: z.string(),
    createdDate: z.string(),
    updatedDate: z.string().optional()
});

const CheckpointSchema = z.object({
    nextPageIndex: z.number().int().nonnegative()
});

const sync = createSync({
    description: 'Sync issues.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Issue: IssueSchema
    },

    exec: async (nango) => {
        // POST /v1/issues/query exposes pageIndex/pageSize but no changed-since
        // filter, so this remains a full refresh. We still checkpoint the next
        // page index so interrupted runs can resume instead of restarting.
        const checkpoint = await nango.getCheckpoint();
        let hasCheckpoint = checkpoint != null;

        // Deletes are hard deletes (confirmed via 404 after DELETE), so full-refresh
        // delete tracking is safe.
        await nango.trackDeletesStart('Issue');

        let pageIndex = checkpoint?.nextPageIndex ?? 0;
        const pageSize = 100;

        while (true) {
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            const response = await nango.post({
                endpoint: '/v1/issues/query',
                data: {
                    sortField: 'createdDate',
                    sortDirection: 'ASC',
                    pageSize,
                    pageIndex
                },
                retries: 3
            });

            const parsed = PaginatedIssuesResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse issues response: ${parsed.error.message}`);
            }

            const { items } = parsed.data;

            if (items.length === 0) {
                break;
            }

            const issues = items.map((issue) => ({
                id: issue._id,
                userId: issue.userId,
                teamId: issue.teamId,
                companyId: issue.companyId,
                archived: issue.archived,
                ...(issue.archivedDate != null && { archivedDate: issue.archivedDate }),
                completed: issue.completed,
                ...(issue.completedDate != null && { completedDate: issue.completedDate }),
                createdBy: issue.createdBy,
                deleted: issue.deleted,
                ...(issue.description != null && { description: issue.description }),
                ...(issue.intervalCode != null && { intervalCode: issue.intervalCode }),
                ...(issue.priority != null && { priority: issue.priority }),
                title: issue.title,
                createdDate: issue.createdDate,
                ...(issue.updatedDate != null && { updatedDate: issue.updatedDate })
            }));

            await nango.batchSave(issues, 'Issue');

            const nextPageIndex = pageIndex + 1;
            if (nextPageIndex * pageSize < parsed.data.totalCount) {
                await nango.saveCheckpoint({ nextPageIndex });
                hasCheckpoint = true;
            }

            pageIndex = nextPageIndex;
        }

        if (hasCheckpoint) {
            await nango.clearCheckpoint();
        }

        await nango.trackDeletesEnd('Issue');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
