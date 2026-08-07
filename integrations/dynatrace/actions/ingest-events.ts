import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    eventType: z
        .enum([
            'AVAILABILITY_EVENT',
            'CUSTOM_ALERT',
            'CUSTOM_ANNOTATION',
            'CUSTOM_CONFIGURATION',
            'CUSTOM_DEPLOYMENT',
            'CUSTOM_INFO',
            'ERROR_EVENT',
            'MARKED_FOR_TERMINATION',
            'PERFORMANCE_EVENT',
            'RESOURCE_CONTENTION_EVENT',
            'WARNING'
        ])
        .describe('Event type. Example: "CUSTOM_INFO"'),
    title: z.string().describe('Event title. Example: "Deployment started"'),
    entitySelector: z.string().optional().describe('Entity selector expression. Example: "type(HOST)"'),
    properties: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Custom properties as key-value pairs. Values must be strings, numbers, or booleans.'),
    startTime: z.number().int().optional().describe('The start time of the event, in UTC milliseconds.'),
    endTime: z.number().int().optional().describe('The end time of the event, in UTC milliseconds.'),
    timeout: z.number().int().optional().describe('Timeout in minutes before the event auto-expires. Defaults to 15.')
});

const EventIngestResultSchema = z.object({
    correlationId: z.string(),
    status: z.enum(['OK', 'INVALID_ENTITY_TYPE', 'INVALID_METADATA', 'INVALID_TIMESTAMPS'])
});

const ProviderResponseSchema = z.object({
    reportCount: z.number(),
    eventIngestResults: z.array(EventIngestResultSchema)
});

const OutputSchema = z.object({
    reportCount: z.number(),
    eventIngestResults: z.array(EventIngestResultSchema)
});

const action = createAction({
    description: 'Push a custom event (info, alert, or annotation) onto one or more entities.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['events.ingest'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            eventType: input.eventType,
            title: input.title,
            ...(input.entitySelector !== undefined && { entitySelector: input.entitySelector }),
            ...(input.properties !== undefined && { properties: input.properties }),
            ...(input.startTime !== undefined && { startTime: input.startTime }),
            ...(input.endTime !== undefined && { endTime: input.endTime }),
            ...(input.timeout !== undefined && { timeout: input.timeout })
        };

        const response = await nango.post({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/events-v2/post-event
            endpoint: '/api/v2/events/ingest',
            data: body,
            // Event ingestion is not idempotent, so keep retries at the minimum allowed value to limit duplicate-event risk on transient failures.
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Received an empty response from the Dynatrace events API.'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            reportCount: providerResponse.reportCount,
            eventIngestResults: providerResponse.eventIngestResults
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
