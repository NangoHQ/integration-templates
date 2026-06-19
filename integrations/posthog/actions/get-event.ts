import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('PostHog project ID. Example: "309484"'),
    id: z.string().describe('Event ID. Example: "019e8cf4-b6c4-7ec7-bf3c-d7deb1549ae7"')
});

const ElementSchema = z
    .object({
        event: z.string().optional(),
        text: z.string().optional(),
        tag_name: z.string().optional(),
        attr_class: z.array(z.string()).optional(),
        href: z.string().optional(),
        attr_id: z.string().optional(),
        nth_child: z.number().optional(),
        nth_of_type: z.number().optional(),
        attributes: z.record(z.string(), z.unknown()).nullable().optional(),
        order: z.number().optional()
    })
    .passthrough();

const ProviderEventSchema = z
    .object({
        id: z.string(),
        distinct_id: z.string().optional(),
        properties: z.record(z.string(), z.unknown()).optional(),
        event: z.string().optional(),
        timestamp: z.string().optional(),
        person: z.record(z.string(), z.unknown()).nullable().optional(),
        elements: z.array(ElementSchema).optional(),
        elements_chain: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    distinct_id: z.string().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    event: z.string().optional(),
    timestamp: z.string().optional(),
    person: z.record(z.string(), z.unknown()).optional(),
    elements: z.array(ElementSchema).optional(),
    elements_chain: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single event from PostHog.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['query:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const projectId = input.project_id;

        const response = await nango.get({
            // https://posthog.com/docs/api/events
            endpoint: `/api/projects/${encodeURIComponent(projectId)}/events/${encodeURIComponent(input.id)}/`,
            retries: 3
        });

        const providerEvent = ProviderEventSchema.parse(response.data);

        return {
            id: providerEvent.id,
            ...(providerEvent.distinct_id !== undefined && { distinct_id: providerEvent.distinct_id }),
            ...(providerEvent.properties !== undefined && { properties: providerEvent.properties }),
            ...(providerEvent.event !== undefined && { event: providerEvent.event }),
            ...(providerEvent.timestamp !== undefined && { timestamp: providerEvent.timestamp }),
            ...(providerEvent.person != null && { person: providerEvent.person }),
            ...(providerEvent.elements !== undefined && { elements: providerEvent.elements }),
            ...(providerEvent.elements_chain !== undefined && { elements_chain: providerEvent.elements_chain })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
