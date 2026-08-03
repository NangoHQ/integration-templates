import { createSync } from 'nango';
import { z } from 'zod';

const PAGE_SIZE = 500;

const ProviderProblemSchema = z
    .object({
        problemId: z.string(),
        displayId: z.string().optional(),
        title: z.string(),
        status: z.string(),
        severityLevel: z.string().optional(),
        impactLevel: z.string().optional(),
        startTime: z.number().optional(),
        endTime: z.number().optional(),
        rootCauseEntity: z.unknown().optional(),
        affectedEntities: z.array(z.unknown()).optional(),
        impactedEntities: z.array(z.unknown()).optional(),
        entityTags: z.array(z.unknown()).optional(),
        problemFilters: z.array(z.unknown()).optional(),
        managementZones: z.array(z.unknown()).optional(),
        recentComments: z.unknown().optional()
    })
    .passthrough();

const ProviderProblemsListSchema = z.object({
    problems: z.array(ProviderProblemSchema),
    nextPageKey: z.string().nullable().optional(),
    pageSize: z.number().optional(),
    totalCount: z.number().optional()
});

const ProblemSchema = z.object({
    id: z.string(),
    problemId: z.string(),
    displayId: z.string().optional(),
    title: z.string(),
    status: z.string(),
    severityLevel: z.string().optional(),
    impactLevel: z.string().optional(),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
    rootCauseEntity: z.unknown().optional(),
    affectedEntities: z.array(z.unknown()).optional(),
    impactedEntities: z.array(z.unknown()).optional(),
    entityTags: z.array(z.unknown()).optional(),
    problemFilters: z.array(z.unknown()).optional(),
    managementZones: z.array(z.unknown()).optional(),
    recentComments: z.unknown().optional()
});

const CheckpointSchema = z.object({
    from: z.string(),
    openProblemIds: z.string()
});

function isProblemStillOpen(status: string): boolean {
    return status !== 'CLOSED';
}

const sync = createSync({
    description: 'Sync detected problems (Davis AI-correlated issues).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Problem: ProblemSchema
    },

    exec: async (nango) => {
        // Save the run start as the next lower bound so changes during this run are re-read instead of skipped.
        const syncStartedAt = new Date().toISOString();
        const checkpoint = await nango.getCheckpoint();

        let from: string;
        let previousOpenIds: string[];
        if (checkpoint === null || checkpoint === undefined) {
            from = '-1h';
            previousOpenIds = [];
        } else {
            const checkpointParsed = CheckpointSchema.safeParse(checkpoint);
            if (!checkpointParsed.success) {
                throw new Error(`Invalid checkpoint: ${checkpointParsed.error.message}`);
            }
            from = checkpointParsed.data.from;
            previousOpenIds =
                checkpointParsed.data.openProblemIds.length > 0 ? checkpointParsed.data.openProblemIds.split(',').filter((id) => id.length > 0) : [];
        }

        const newProblems = new Map<string, z.infer<typeof ProviderProblemSchema>>();
        let nextPageKey: string | null | undefined = undefined;

        do {
            const params: Record<string, string | number> = {};
            if (nextPageKey) {
                params['nextPageKey'] = nextPageKey;
            } else {
                params['from'] = from;
                params['pageSize'] = PAGE_SIZE;
            }

            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/problems/get-problems-list
            const response = await nango.get({
                endpoint: '/api/v2/problems',
                params,
                retries: 3
            });

            const listParsed = ProviderProblemsListSchema.safeParse(response.data);
            if (!listParsed.success) {
                throw new Error(`Failed to parse problems list: ${listParsed.error.message}`);
            }

            for (const problem of listParsed.data.problems) {
                newProblems.set(problem.problemId, problem);
            }

            nextPageKey = listParsed.data.nextPageKey ?? undefined;
            if (typeof nextPageKey === 'string' && nextPageKey.trim() === '') {
                nextPageKey = undefined;
            }
        } while (nextPageKey);

        const currentOpenIds = new Set<string>();
        for (const [, problem] of newProblems) {
            if (isProblemStillOpen(problem.status)) {
                currentOpenIds.add(problem.problemId);
            }
        }

        const extraProblems = new Map<string, z.infer<typeof ProviderProblemSchema>>();
        for (const problemId of previousOpenIds) {
            if (newProblems.has(problemId)) {
                continue;
            }

            // @allowTryCatch: a previously open problem may have been deleted or purged,
            // in which case we skip it and stop tracking it as open.
            try {
                // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/problems/get-problem
                const response = await nango.get({
                    endpoint: `/api/v2/problems/${encodeURIComponent(problemId)}`,
                    retries: 3
                });

                const problemParsed = ProviderProblemSchema.safeParse(response.data);
                if (!problemParsed.success) {
                    throw new Error(`Failed to parse problem ${problemId}: ${problemParsed.error.message}`);
                }

                if (isProblemStillOpen(problemParsed.data.status)) {
                    currentOpenIds.add(problemId);
                }
                extraProblems.set(problemId, problemParsed.data);
            } catch (err) {
                if (err instanceof Error && (err.message.includes('404') || err.message.includes('Not Found'))) {
                    await nango.log(`Problem ${problemId} not found, skipping re-fetch`);
                    continue;
                }
                throw err;
            }
        }

        const allProblems = new Map<string, z.infer<typeof ProviderProblemSchema>>();
        for (const [, problem] of newProblems) {
            allProblems.set(problem.problemId, problem);
        }
        for (const [, problem] of extraProblems) {
            allProblems.set(problem.problemId, problem);
        }

        const mapped = Array.from(allProblems.values()).map((problem) => ({
            id: problem.problemId,
            problemId: problem.problemId,
            ...(problem.displayId != null && { displayId: problem.displayId }),
            title: problem.title,
            status: problem.status,
            ...(problem.severityLevel != null && { severityLevel: problem.severityLevel }),
            ...(problem.impactLevel != null && { impactLevel: problem.impactLevel }),
            ...(problem.startTime != null && { startTime: problem.startTime }),
            ...(problem.endTime != null && { endTime: problem.endTime }),
            ...(problem.rootCauseEntity != null && { rootCauseEntity: problem.rootCauseEntity }),
            ...(problem.affectedEntities != null && { affectedEntities: problem.affectedEntities }),
            ...(problem.impactedEntities != null && { impactedEntities: problem.impactedEntities }),
            ...(problem.entityTags != null && { entityTags: problem.entityTags }),
            ...(problem.problemFilters != null && { problemFilters: problem.problemFilters }),
            ...(problem.managementZones != null && { managementZones: problem.managementZones }),
            ...(problem.recentComments != null && { recentComments: problem.recentComments })
        }));

        if (mapped.length > 0) {
            await nango.batchSave(mapped, 'Problem');
        }

        await nango.saveCheckpoint({
            from: syncStartedAt,
            openProblemIds: Array.from(currentOpenIds).sort().join(',')
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
