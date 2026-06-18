import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_type: z.string().optional().describe('Name of the event type the event property belongs to. Example: "Onboard Finish"'),
    event_property: z.string().describe('The event property name. Example: "Shared"')
});

const ProviderEventPropertySchema = z.object({
    event_property: z.string(),
    event_type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    regex: z.string().nullable().optional(),
    enum_values: z.string().nullable().optional(),
    is_array_type: z.boolean().optional(),
    is_required: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
    classifications: z.array(z.string()).optional()
});

const OutputSchema = ProviderEventPropertySchema;

const action = createAction({
    description: 'Retrieve an event property in taxonomy.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://amplitude.com/docs/apis/analytics/taxonomy#get-a-single-event-property
            endpoint: `/api/2/taxonomy/event-property/${encodeURIComponent(input.event_property)}`,
            params: {
                ...(input.event_type !== undefined && { event_type: input.event_type })
            },
            retries: 3
        });

        const envelope = z
            .object({
                success: z.boolean(),
                data: z.unknown()
            })
            .parse(response.data);

        if (!envelope.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Event property not found or taxonomy API returned an error'
            });
        }

        const property = ProviderEventPropertySchema.parse(envelope.data);
        return property;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
