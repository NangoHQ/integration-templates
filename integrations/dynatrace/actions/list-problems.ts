import { z } from 'zod';
import { createAction } from 'nango';

const EntityStubSchema = z
    .object({
        entityId: z
            .object({
                id: z.string(),
                type: z.string()
            })
            .passthrough(),
        name: z.string().optional()
    })
    .passthrough();

const METagSchema = z
    .object({
        context: z.string().optional(),
        key: z.string().optional(),
        stringRepresentation: z.string().optional(),
        value: z.string().optional()
    })
    .passthrough();

const ManagementZoneSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional()
    })
    .passthrough();

const AlertingProfileStubSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional()
    })
    .passthrough();

const LinkedProblemSchema = z
    .object({
        displayId: z.string().optional(),
        problemId: z.string().optional()
    })
    .passthrough();

const RecentCommentSchema = z
    .object({
        authorName: z.string().optional(),
        content: z.string().optional(),
        context: z.string().optional(),
        createdAtTimestamp: z.number().optional(),
        id: z.string().optional()
    })
    .passthrough();

const RecentCommentsListSchema = z
    .object({
        comments: z.array(RecentCommentSchema).optional(),
        nextPageKey: z.string().optional(),
        pageSize: z.number().optional(),
        totalCount: z.number().optional()
    })
    .passthrough();

const EvidenceDetailSchema = z
    .object({
        displayName: z.string().optional(),
        evidenceType: z.string().optional(),
        rootCauseRelevant: z.boolean().optional(),
        startTime: z.number().optional()
    })
    .passthrough();

const EvidenceDetailsSchema = z
    .object({
        details: z.array(EvidenceDetailSchema).optional(),
        totalCount: z.number().optional()
    })
    .passthrough();

const ImpactSchema = z
    .object({
        impactType: z.string().optional(),
        estimatedAffectedUsers: z.number().optional()
    })
    .passthrough();

const ImpactAnalysisSchema = z
    .object({
        impacts: z.array(ImpactSchema).optional()
    })
    .passthrough();

const ProblemSchema = z
    .object({
        problemId: z.string(),
        displayId: z.string().optional(),
        title: z.string().optional(),
        impactLevel: z.string().optional(),
        severityLevel: z.string().optional(),
        status: z.string().optional(),
        startTime: z.number().optional(),
        endTime: z.number().optional(),
        affectedEntities: z.array(EntityStubSchema).optional(),
        impactedEntities: z.array(EntityStubSchema).optional(),
        rootCauseEntity: EntityStubSchema.nullable().optional(),
        managementZones: z.array(ManagementZoneSchema).optional(),
        entityTags: z.array(METagSchema).optional(),
        problemFilters: z.array(AlertingProfileStubSchema).optional(),
        linkedProblemInfo: LinkedProblemSchema.optional(),
        recentComments: RecentCommentsListSchema.optional(),
        evidenceDetails: EvidenceDetailsSchema.optional(),
        impactAnalysis: ImpactAnalysisSchema.optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    problems: z.array(ProblemSchema),
    nextPageKey: z.string().nullable().optional(),
    totalCount: z.number().optional(),
    pageSize: z.number().optional(),
    warnings: z.array(z.string()).optional()
});

const InputSchema = z.object({
    from: z.string().optional().describe('Start of the time window. Accepts relative expressions like "-1h", "-7d", or epoch millis.'),
    problemSelector: z.string().optional().describe('Problem selector string to filter results.'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from a previous response.'),
    pageSize: z.number().int().min(1).max(500).optional().describe('Number of results per page. Max 500.')
});

const OutputSchema = z.object({
    problems: z.array(ProblemSchema),
    nextPageKey: z.string().nullable().optional(),
    totalCount: z.number().optional(),
    pageSize: z.number().optional(),
    warnings: z.array(z.string()).optional()
});

const action = createAction({
    description: 'List detected problems (Davis AI-correlated issues) in a time window.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['problems.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Dynatrace requires nextPageKey to be sent alone on continuation requests; filters/pageSize are only valid on the first page.
        const params: Record<string, string> = input.cursor
            ? { nextPageKey: input.cursor }
            : {
                  ...(input.from !== undefined && { from: input.from }),
                  ...(input.problemSelector !== undefined && { problemSelector: input.problemSelector }),
                  ...(input.pageSize !== undefined && { pageSize: String(input.pageSize) })
              };

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/problems/get-problems-list
            endpoint: '/api/v2/problems',
            params,
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object') {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected non-object response from Dynatrace problems API'
            });
        }

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'Response validation failed',
                details: parsed.error.issues
            });
        }

        return {
            problems: parsed.data.problems,
            ...(parsed.data.nextPageKey != null && { nextPageKey: parsed.data.nextPageKey }),
            ...(parsed.data.totalCount !== undefined && { totalCount: parsed.data.totalCount }),
            ...(parsed.data.pageSize !== undefined && { pageSize: parsed.data.pageSize }),
            ...(parsed.data.warnings !== undefined && { warnings: parsed.data.warnings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
