import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('Event title. Example: "Deployment started"'),
    text: z.string().describe('Event body text. Example: "Deployed version 1.2.3"'),
    tags: z.array(z.string()).optional().describe('List of tags to attach to the event. Example: ["env:production", "service:api"]')
});

const ProviderEventSchema = z.object({
    id: z.number().describe('The numeric event id assigned by Datadog'),
    title: z.string().optional(),
    text: z.string().optional(),
    url: z.string().optional().describe('Public event URL'),
    tags: z.array(z.string()).optional()
});

const ProviderResponseSchema = z.object({
    event: ProviderEventSchema.optional(),
    status: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number().describe('The numeric event id assigned by Datadog'),
    title: z.string().optional(),
    text: z.string().optional(),
    url: z.string().optional().describe('Public event URL'),
    tags: z.array(z.string()).optional()
});

const action = createAction({
    description: 'Create a custom event (annotation) on the Datadog event stream.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/events/#post-an-event
            endpoint: 'v1/events',
            data: {
                title: input.title,
                text: input.text,
                ...(input.tags !== undefined && { tags: input.tags })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const event = providerResponse.event;

        if (!event) {
            throw new nango.ActionError({
                type: 'missing_event',
                message: 'Event not returned in response'
            });
        }

        return {
            id: event.id,
            ...(event.title !== undefined && { title: event.title }),
            ...(event.text !== undefined && { text: event.text }),
            ...(event.url !== undefined && { url: event.url }),
            ...(event.tags !== undefined && { tags: event.tags })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
