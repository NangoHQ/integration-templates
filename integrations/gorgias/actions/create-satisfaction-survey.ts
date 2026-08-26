import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        ticket_id: z.number().describe('The ID of the ticket to associate the survey with. Example: 82682724'),
        customer_id: z.number().describe('The ID of the customer to associate the survey with. Example: 519543245')
    })
    .describe('Input for creating a satisfaction survey record.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique ID of the satisfaction survey. Example: 6960684'),
        ticket_id: z.number().describe('The ID of the associated ticket. Example: 82682724'),
        customer_id: z.number().describe('The ID of the associated customer. Example: 519543245'),
        score: z.number().nullable().optional().describe('The satisfaction score, if already set.'),
        scored_datetime: z.string().nullable().optional().describe('ISO 8601 timestamp when the survey was scored, if applicable.'),
        sent_datetime: z.string().nullable().optional().describe('ISO 8601 timestamp when the survey email was sent, if applicable.'),
        should_send_datetime: z.string().nullable().optional().describe('ISO 8601 timestamp when the survey email is scheduled to be sent, if applicable.'),
        url: z.string().nullable().optional().describe('The public URL of the satisfaction survey, if available.'),
        created_datetime: z.string().optional().describe('ISO 8601 timestamp when the survey record was created.'),
        updated_datetime: z.string().optional().describe('ISO 8601 timestamp when the survey record was last updated.')
    })
    .describe('A satisfaction survey record for a ticket and customer.');

/**
 * @tags: [write]
 * @tagReason: Creates a new satisfaction survey record via POST /api/satisfaction-surveys.
 * @pitfalls: Creating a survey record does not itself trigger sending the survey email; actual sending is scheduled by account settings or ticket-close events. A ticket can only have a single satisfaction survey.
 */
const action = createAction({
    description: 'Create a satisfaction survey record for a ticket and customer.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.gorgias.com/reference/create-satisfaction-survey
            endpoint: '/api/satisfaction-surveys',
            data: {
                ticket_id: input.ticket_id,
                customer_id: input.customer_id
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'No data returned from the provider when creating satisfaction survey.'
            });
        }

        const survey = OutputSchema.parse(response.data);
        return survey;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
