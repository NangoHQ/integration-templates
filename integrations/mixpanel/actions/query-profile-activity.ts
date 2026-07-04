import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.number().describe('Mixpanel project ID. Required for service account authentication. Example: 4040293'),
    distinct_ids: z.array(z.string()).describe('Array of distinct IDs to query activity for. Example: ["user-123"]'),
    from_date: z.string().describe('Start date in yyyy-mm-dd format (inclusive). Example: 2024-01-01'),
    to_date: z.string().describe('End date in yyyy-mm-dd format (inclusive). Example: 2024-01-31'),
    workspace_id: z.number().optional().describe('Workspace ID if applicable. Example: 4536550'),
    limit: z.number().int().positive().optional().describe('Maximum number of events to return. Defaults to 100.')
});

const ProviderEventSchema = z.object({
    event: z.string(),
    properties: z.unknown().optional()
});

const ProviderResponseSchema = z.object({
    status: z.string(),
    results: z.object({
        events: z.array(ProviderEventSchema)
    })
});

const OutputSchema = z.object({
    status: z.string(),
    results: z.object({
        events: z.array(ProviderEventSchema)
    })
});

const action = createAction({
    description: 'Query a profile event activity stream.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string> = {
            project_id: String(input.project_id),
            distinct_ids: JSON.stringify(input.distinct_ids),
            from_date: input.from_date,
            to_date: input.to_date
        };

        if (input.workspace_id !== undefined) {
            params['workspace_id'] = String(input.workspace_id);
        }

        let response;
        // @allowTryCatch: The Mixpanel Query API returns 402 for free-tier projects.
        // Catching the error allows us to extract the response data and return a structured output.
        try {
            response = await nango.get({
                // https://developer.mixpanel.com/reference/activity-stream-query
                endpoint: '/api/query/stream/query',
                params,
                retries: 3
            });
        } catch (error: unknown) {
            const status =
                error !== null && typeof error === 'object' && 'status' in error && (typeof error.status === 'number' || typeof error.status === 'string')
                    ? Number(error.status)
                    : undefined;
            if (status === 402 || status === 403) {
                return {
                    status: 'error',
                    results: {
                        events: []
                    }
                };
            }
            throw error;
        }

        if (response.status && response.status >= 400) {
            return {
                status: 'error',
                results: {
                    events: []
                }
            };
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const limit = input.limit ?? 100;
        const events = providerResponse.results.events;
        const boundedEvents = events.slice(0, limit);

        return {
            status: providerResponse.status,
            results: {
                events: boundedEvents
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
