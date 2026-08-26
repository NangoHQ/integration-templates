import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the event to retrieve.')
    })
    .describe('Input for retrieving a single Gorgias event by its ID.');

const OutputSchema = z
    .object({
        id: z.number().optional().describe('The unique identifier of the event.'),
        context: z.string().nullable().optional().describe('An uuid4 used to group a sequence of related events together.'),
        created_datetime: z.string().optional().describe('When the event was created.'),
        data: z.record(z.string(), z.unknown()).nullable().optional().describe('Data associated with the event (key-value data).'),
        object_id: z.number().optional().describe('The ID of the Gorgias object associated with the event.'),
        object_type: z.string().optional().describe('The type of the existing Gorgias object associated with the event.'),
        type: z.string().optional().describe('Type of the event.'),
        user_id: z.number().optional().describe('ID of the user who triggered the event. If empty, the event has been triggered automatically.'),
        uri: z.string().optional().describe('URI of the event.')
    })
    .describe('A single Gorgias event record.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single event from the Gorgias REST API.
 */
const action = createAction({
    description: 'Retrieve a single event.',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],
    exec: async (nango, input) => {
        // https://developers.gorgias.com/reference/get-event
        const response = await nango.get({
            endpoint: `/api/events/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });
        const event = OutputSchema.parse(response.data);
        return event;
    }
});

export default action;
