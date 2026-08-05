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
    description: z.string().optional().describe('Detailed description of the event.'),
    properties: z.record(z.string(), z.string()).optional().describe('Custom properties as key-value pairs.'),
    timeout: z.number().optional().describe('Timeout in minutes before the event auto-expires.')
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
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['events.ingest'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {
            eventType: input.eventType,
            title: input.title,
            ...(input.entitySelector !== undefined && { entitySelector: input.entitySelector }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.properties !== undefined && { properties: input.properties }),
            ...(input.timeout !== undefined && { timeout: input.timeout })
        };

        const response = await nango.post({
            // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/events-v2/post-event
            endpoint: '/api/v2/events/ingest',
            data: body,
            retries: 3
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
