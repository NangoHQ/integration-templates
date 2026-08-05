import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    problemId: z.string().describe('The ID of the problem to retrieve. Example: "6853744532401203457_1785946260000V2"')
});

const EntityIdSchema = z.object({
    id: z.string(),
    type: z.string()
});

const EntityReferenceSchema = z.object({
    entityId: EntityIdSchema,
    name: z.string()
});

const TagSchema = z.object({
    context: z.string(),
    key: z.string(),
    value: z.string().optional(),
    stringRepresentation: z.string()
});

const EvidenceDetailSchema = z.object({
    evidenceType: z.string(),
    displayName: z.string(),
    entity: EntityReferenceSchema,
    groupingEntity: EntityReferenceSchema,
    rootCauseRelevant: z.boolean(),
    metricId: z.string().optional(),
    unit: z.string().optional(),
    aggregationType: z.string().nullable().optional(),
    valueBeforeChangePoint: z.number().optional(),
    valueAfterChangePoint: z.number().optional(),
    startTime: z.number(),
    endTime: z.number(),
    eventId: z.string().optional(),
    eventType: z.string().optional(),
    data: z.unknown().optional()
});

const CommentSchema = z.object({
    id: z.string(),
    createdAtTimestamp: z.number(),
    content: z.string(),
    authorName: z.string(),
    context: z.string().optional()
});

const ProblemSchema = z
    .object({
        problemId: z.string(),
        displayId: z.string(),
        title: z.string(),
        impactLevel: z.string(),
        severityLevel: z.string(),
        status: z.string(),
        affectedEntities: z.array(EntityReferenceSchema),
        impactedEntities: z.array(EntityReferenceSchema),
        rootCauseEntity: EntityReferenceSchema.nullable().optional(),
        managementZones: z.array(z.unknown()),
        entityTags: z.array(TagSchema),
        problemFilters: z.array(z.unknown()),
        startTime: z.number(),
        endTime: z.number(),
        evidenceDetails: z
            .object({
                totalCount: z.number(),
                details: z.array(EvidenceDetailSchema)
            })
            .optional(),
        recentComments: z
            .object({
                totalCount: z.number(),
                comments: z.array(CommentSchema)
            })
            .optional(),
        impactAnalysis: z
            .object({
                impacts: z.array(z.unknown())
            })
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get full details of a single problem.',
    version: '1.0.0',
    input: InputSchema,
    output: ProblemSchema,
    scopes: ['problems.read'],

    exec: async (nango, input): Promise<z.infer<typeof ProblemSchema>> => {
        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems/problems-api/get-problem
            endpoint: `/api/v2/problems/${encodeURIComponent(input.problemId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Problem ${input.problemId} not found.`
            });
        }

        const problem = ProblemSchema.parse(response.data);
        return problem;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
