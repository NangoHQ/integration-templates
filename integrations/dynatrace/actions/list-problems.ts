import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    from: z.string().optional().describe('Start of the requested timeframe. Example: "-7d" or epoch milliseconds.'),
    to: z.string().optional().describe('End of the requested timeframe.'),
    problemSelector: z.string().optional().describe('Selector to filter problems. Example: status("open")'),
    pageSize: z.number().int().min(1).max(500).optional().describe('Amount of problems per page. Max 500.'),
    sort: z.string().optional().describe('Sort criteria. Example: "-startTime"'),
    fields: z.string().optional().describe('Additional fields to include. Example: "evidenceDetails,impactAnalysis,recentComments"')
});

const EntityStubSchema = z.object({
    entityId: z.object({
        id: z.string(),
        type: z.string()
    }),
    name: z.string().optional()
});

const METagSchema = z.object({
    context: z.string().optional(),
    key: z.string().optional(),
    stringRepresentation: z.string().optional(),
    value: z.string().optional()
});

const ManagementZoneSchema = z.object({
    id: z.string(),
    name: z.string()
});

const AlertingProfileStubSchema = z.object({
    id: z.string(),
    name: z.string()
});

const LinkedProblemSchema = z.object({
    displayId: z.string(),
    problemId: z.string()
});

const ProblemSchema = z
    .object({
        problemId: z.string(),
        displayId: z.string(),
        title: z.string(),
        severityLevel: z.string(),
        status: z.string(),
        startTime: z.number(),
        endTime: z.number(),
        impactLevel: z.string().optional(),
        affectedEntities: z.array(EntityStubSchema).optional(),
        impactedEntities: z.array(EntityStubSchema).optional(),
        rootCauseEntity: z.union([EntityStubSchema, z.null()]).optional(),
        entityTags: z.array(METagSchema).optional(),
        managementZones: z.array(ManagementZoneSchema).optional(),
        problemFilters: z.array(AlertingProfileStubSchema).optional(),
        linkedProblemInfo: LinkedProblemSchema.optional(),
        evidenceDetails: z.record(z.string(), z.unknown()).optional(),
        impactAnalysis: z.record(z.string(), z.unknown()).optional(),
        recentComments: z.record(z.string(), z.unknown()).optional(),
        'k8s.cluster.name': z.array(z.string()).optional(),
        'k8s.cluster.uid': z.array(z.string()).optional(),
        'k8s.namespace.name': z.array(z.string()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    problems: z.array(z.unknown()),
    nextPageKey: z.string().nullable().optional(),
    totalCount: z.number(),
    pageSize: z.number(),
    warnings: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    problems: z.array(ProblemSchema),
    nextPageKey: z.string().optional(),
    totalCount: z.number(),
    pageSize: z.number(),
    warnings: z.array(z.string()).optional()
});

const action = createAction({
    description: 'List detected problems in a time window.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['problems.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Dynatrace rejects continuation requests that include any parameter besides nextPageKey and fields.
        const params: Record<string, string | number> = input.cursor
            ? {
                  nextPageKey: input.cursor,
                  ...(input.fields !== undefined && { fields: input.fields })
              }
            : {
                  ...(input.from !== undefined && { from: input.from }),
                  ...(input.to !== undefined && { to: input.to }),
                  ...(input.problemSelector !== undefined && { problemSelector: input.problemSelector }),
                  ...(input.pageSize !== undefined && { pageSize: input.pageSize }),
                  ...(input.sort !== undefined && { sort: input.sort }),
                  ...(input.fields !== undefined && { fields: input.fields })
              };

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/problems-v2/problems/get-problems-list
            endpoint: '/api/v2/problems',
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Dynatrace problems API',
                details: parsed.error.message
            });
        }

        const { problems, totalCount, pageSize, nextPageKey, warnings } = parsed.data;

        return {
            problems: problems.map((item: unknown) => ProblemSchema.parse(item)),
            totalCount,
            pageSize,
            ...(nextPageKey != null && { nextPageKey }),
            ...(warnings !== undefined && { warnings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
