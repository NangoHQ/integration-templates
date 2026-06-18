import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().optional().describe('The workspace ID. Example: "7273476131570014205"'),
    managerId: z.string().optional().describe('The manager user ID. Example: "7254376376091929519"'),
    from: z.string().optional().describe('Association time filter start - ISO 8601 format. Example: "2026-01-01T00:00:00Z"'),
    to: z.string().optional().describe('Association time filter end - ISO 8601 format. Example: "2026-06-01T00:00:00Z"')
});

const CoachingUserSchema = z.object({
    id: z.string(),
    emailAddress: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    title: z.string().optional()
});

const CoachingRepDataSchema = z.object({
    report: CoachingUserSchema,
    metrics: z.record(z.string(), z.array(z.string())).optional()
});

const CoachingMetricsDataSchema = z.object({
    manager: CoachingUserSchema,
    directReportsMetrics: z.array(CoachingRepDataSchema).optional()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    coachingData: z.array(CoachingMetricsDataSchema).optional()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    coachingData: z.array(CoachingMetricsDataSchema).optional()
});

const UnavailableErrorSchema = z.object({
    status: z.union([z.literal(401), z.literal(404)])
});

const UnavailableErrorResponseSchema = z.object({
    response: z.object({
        status: z.union([z.literal(401), z.literal(404)])
    })
});

function isUnavailableError(error: unknown): boolean {
    if (UnavailableErrorSchema.safeParse(error).success) {
        return true;
    }
    if (UnavailableErrorResponseSchema.safeParse(error).success) {
        return true;
    }
    return false;
}

const action = createAction({
    description: 'Retrieve all coaching metrics from Gong.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:coaching:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // @allowTryCatch - Gong coaching endpoint is plan-gated and returns 404 on standard accounts.
        // We handle this gracefully by returning an empty coachingData array instead of hard-failing.
        try {
            const response = await nango.get({
                // https://help.gong.io/apidocs/list-all-coaching-metrics-v2coaching-1
                endpoint: '/v2/coaching',
                params: {
                    ...(input.workspaceId && { 'workspace-id': input.workspaceId }),
                    ...(input.managerId && { 'manager-id': input.managerId }),
                    ...(input.from && { from: input.from }),
                    ...(input.to && { to: input.to })
                },
                retries: 3
            });

            if (response.status === 401 || response.status === 404) {
                return {
                    coachingData: []
                };
            }

            const providerResponse = ProviderResponseSchema.parse(response.data);
            return {
                requestId: providerResponse.requestId,
                coachingData: providerResponse.coachingData
            };
        } catch (error) {
            if (isUnavailableError(error)) {
                return {
                    coachingData: []
                };
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
