import { createSync } from 'nango';
import { z } from 'zod';

const DynatraceProblemSchema = z.object({
    problemId: z.string(),
    displayId: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    impactLevel: z.string().nullable().optional(),
    severityLevel: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    affectedEntities: z.array(z.object({}).passthrough()).nullable().optional(),
    impactedEntities: z.array(z.object({}).passthrough()).nullable().optional(),
    rootCauseEntity: z.object({}).passthrough().nullable().optional(),
    managementZones: z.array(z.object({}).passthrough()).nullable().optional(),
    tags: z.array(z.object({}).passthrough()).nullable().optional(),
    problemFilters: z.array(z.object({}).passthrough()).nullable().optional(),
    startTime: z.number().nullable().optional(),
    endTime: z.number().nullable().optional(),
    recentComments: z.object({}).passthrough().nullable().optional(),
    impactAnalysis: z.object({}).passthrough().nullable().optional(),
    problemDetails: z.object({}).passthrough().nullable().optional()
});

const ProblemListResponseSchema = z.object({
    problems: z.array(DynatraceProblemSchema),
    totalCount: z.number().optional(),
    pageSize: z.number().optional(),
    nextPageKey: z.string().optional()
});

const ProblemSchema = z.object({
    id: z.string(),
    problemId: z.string(),
    displayId: z.string().optional(),
    title: z.string().optional(),
    impactLevel: z.string().optional(),
    severityLevel: z.string().optional(),
    status: z.string().optional(),
    affectedEntities: z.array(z.object({}).passthrough()).optional(),
    impactedEntities: z.array(z.object({}).passthrough()).optional(),
    rootCauseEntity: z.object({}).passthrough().optional(),
    managementZones: z.array(z.object({}).passthrough()).optional(),
    tags: z.array(z.object({}).passthrough()).optional(),
    problemFilters: z.array(z.object({}).passthrough()).optional(),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
    recentComments: z.object({}).passthrough().optional(),
    impactAnalysis: z.object({}).passthrough().optional(),
    problemDetails: z.object({}).passthrough().optional()
});

const CheckpointSchema = z.object({
    from: z.string(),
    openProblemIds: z.string()
});

function normalizeProblem(raw: z.infer<typeof DynatraceProblemSchema>): z.infer<typeof ProblemSchema> {
    return {
        id: raw.problemId,
        problemId: raw.problemId,
        displayId: raw.displayId ?? undefined,
        title: raw.title ?? undefined,
        impactLevel: raw.impactLevel ?? undefined,
        severityLevel: raw.severityLevel ?? undefined,
        status: raw.status ?? undefined,
        affectedEntities: raw.affectedEntities ?? undefined,
        impactedEntities: raw.impactedEntities ?? undefined,
        rootCauseEntity: raw.rootCauseEntity ?? undefined,
        managementZones: raw.managementZones ?? undefined,
        tags: raw.tags ?? undefined,
        problemFilters: raw.problemFilters ?? undefined,
        startTime: raw.startTime ?? undefined,
        endTime: raw.endTime ?? undefined,
        recentComments: raw.recentComments ?? undefined,
        impactAnalysis: raw.impactAnalysis ?? undefined,
        problemDetails: raw.problemDetails ?? undefined
    };
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
        const checkpoint = await nango.getCheckpoint();
        const fromValue = checkpoint?.from ?? '-1h';
        const openProblemIds = checkpoint?.openProblemIds ? checkpoint.openProblemIds.split(',') : [];
        const runStart = new Date().toISOString();

        const problemsMap = new Map<string, z.infer<typeof ProblemSchema>>();

        let nextPageKey: string | undefined;
        let hasMorePages = true;

        while (hasMorePages) {
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems
            const listResponse = await nango.get({
                endpoint: '/api/v2/problems',
                params: nextPageKey ? { nextPageKey } : { from: fromValue, pageSize: 500 },
                retries: 3
            });

            const parsedList = ProblemListResponseSchema.safeParse(listResponse.data);
            if (!parsedList.success) {
                throw new Error(`Failed to parse problems list response: ${parsedList.error.message}`);
            }

            for (const raw of parsedList.data.problems) {
                problemsMap.set(raw.problemId, normalizeProblem(raw));
            }

            nextPageKey = parsedList.data.nextPageKey;
            hasMorePages = Boolean(nextPageKey);
        }

        for (const problemId of openProblemIds) {
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems
            const response = await nango.get({
                endpoint: `/api/v2/problems/${encodeURIComponent(problemId)}`,
                retries: 3
            });

            const parsed = DynatraceProblemSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse problem ${problemId}: ${parsed.error.message}`);
            }

            problemsMap.set(parsed.data.problemId, normalizeProblem(parsed.data));
        }

        const problems = Array.from(problemsMap.values());

        if (problems.length > 0) {
            await nango.batchSave(problems, 'Problem');
        }

        const newOpenProblemIds = problems.filter((problem) => problem.status !== 'RESOLVED').map((problem) => problem.problemId);

        await nango.saveCheckpoint({
            from: runStart,
            openProblemIds: newOpenProblemIds.join(',')
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
