import { z } from 'zod';
import { createAction } from 'nango';

const ProviderSurveySchema = z.object({
    id: z.number(),
    ticket_id: z.number(),
    customer_id: z.number(),
    score: z.number().nullable().optional(),
    scored_datetime: z.string().nullable().optional(),
    sent_datetime: z.string().nullable().optional(),
    should_send_datetime: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    created_datetime: z.string().optional(),
    updated_datetime: z.string().optional()
});

const InputSchema = z
    .object({
        id: z.number().describe('The ID of the satisfaction survey to update.'),
        score: z.number().optional().describe('Customer satisfaction score, typically 1 to 5. Requires scored_datetime and sent_datetime to be set.'),
        scored_datetime: z
            .string()
            .optional()
            .describe('ISO 8601 datetime when the survey was scored. Required when score is set; requires sent_datetime to be set first.'),
        sent_datetime: z.string().optional().describe('ISO 8601 datetime when the survey was sent. Required when scored_datetime is set.'),
        customer_id: z.number().optional().describe('The ID of the customer associated with the survey.'),
        ticket_id: z.number().optional().describe('The ID of the ticket associated with the survey.')
    })
    .describe('Input for updating a satisfaction survey.');

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the satisfaction survey.'),
        ticket_id: z.number().describe('The ID of the ticket associated with the survey.'),
        customer_id: z.number().describe('The ID of the customer associated with the survey.'),
        score: z.number().optional().describe('Customer satisfaction score, typically 1 to 5.'),
        scored_datetime: z.string().optional().describe('ISO 8601 datetime when the survey was scored.'),
        sent_datetime: z.string().optional().describe('ISO 8601 datetime when the survey was sent.'),
        should_send_datetime: z.string().optional().describe('ISO 8601 datetime when the survey should be sent.'),
        url: z.string().optional().describe('The public URL of the satisfaction survey.'),
        created_datetime: z.string().optional().describe('ISO 8601 datetime when the survey was created.'),
        updated_datetime: z.string().optional().describe('ISO 8601 datetime when the survey was last updated.')
    })
    .describe('The updated satisfaction survey.');

/**
 * @tags: [write]
 * @tagReason: Updates an existing satisfaction survey record on the provider.
 * @pitfalls: score can only be set after scored_datetime is populated, and scored_datetime can only be set after sent_datetime is populated — always populate these three fields in strict dependency order.
 */
const action = createAction({
    description: "Update a satisfaction survey (e.g. record a customer's score).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['satisfaction_survey:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body: Record<string, unknown> = {};

        if (input.score !== undefined) {
            body['score'] = input.score;
        }
        if (input.scored_datetime !== undefined) {
            body['scored_datetime'] = input.scored_datetime;
        }
        if (input.sent_datetime !== undefined) {
            body['sent_datetime'] = input.sent_datetime;
        }
        if (input.customer_id !== undefined) {
            body['customer_id'] = input.customer_id;
        }
        if (input.ticket_id !== undefined) {
            body['ticket_id'] = input.ticket_id;
        }

        const response = await nango.put({
            // https://developers.gorgias.com/reference/update-satisfaction-survey
            endpoint: `/api/satisfaction-surveys/${encodeURIComponent(input.id)}`,
            data: body,
            retries: 3
        });

        const survey = ProviderSurveySchema.parse(response.data);

        return {
            id: survey.id,
            ticket_id: survey.ticket_id,
            customer_id: survey.customer_id,
            ...(survey.score != null && { score: survey.score }),
            ...(survey.scored_datetime != null && { scored_datetime: survey.scored_datetime }),
            ...(survey.sent_datetime != null && { sent_datetime: survey.sent_datetime }),
            ...(survey.should_send_datetime != null && { should_send_datetime: survey.should_send_datetime }),
            ...(survey.url != null && { url: survey.url }),
            ...(survey.created_datetime != null && { created_datetime: survey.created_datetime }),
            ...(survey.updated_datetime != null && { updated_datetime: survey.updated_datetime })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
