import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of satisfaction surveys to return. Defaults to 30, maximum is 100.'),
        order_by: z
            .union([z.literal('created_datetime:asc'), z.literal('created_datetime:desc')])
            .optional()
            .describe('Attribute used to order satisfaction surveys. Defaults to created_datetime:desc.'),
        ticket_id: z.number().optional().describe('The ID of the ticket to filter satisfaction surveys by.')
    })
    .describe('Input for listing satisfaction surveys.');

const SatisfactionSurveySchema = z
    .object({
        id: z.number().describe('ID of the survey.'),
        body_text: z.string().optional().describe('The comment sent by the customer.'),
        created_datetime: z.string().optional().describe('When the survey was created.'),
        customer_id: z.number().describe('The ID of the customer who filled the survey.'),
        meta: z.record(z.string(), z.unknown()).optional().describe('Data associated with the satisfaction survey.'),
        score: z.number().optional().describe('The level of satisfaction. Scores range from 1 to 5.'),
        scored_datetime: z.string().optional().describe('When the survey was filled by the customer.'),
        sent_datetime: z.string().optional().describe('When the survey was sent. If not set, it means the survey was not sent yet.'),
        should_send_datetime: z.string().optional().describe('When the survey should be sent. If not set, the survey will not be sent by Gorgias.'),
        ticket_id: z.number().describe('The ID of the ticket the survey is associated with.'),
        uri: z.string().describe('URI of the survey.')
    })
    .describe('A satisfaction survey.');

const OutputSchema = z
    .object({
        items: z.array(SatisfactionSurveySchema).describe('List of satisfaction surveys.'),
        next_cursor: z.string().optional().describe('Cursor to retrieve the next page of results. Omit if there are no more pages.')
    })
    .describe('Output for listing satisfaction surveys.');

const ProviderSurveySchema = z.object({
    id: z.number(),
    body_text: z.string().nullable().optional(),
    created_datetime: z.string().nullable().optional(),
    customer_id: z.number(),
    meta: z.record(z.string(), z.unknown()).nullable().optional(),
    score: z.number().nullable().optional(),
    scored_datetime: z.string().nullable().optional(),
    sent_datetime: z.string().nullable().optional(),
    should_send_datetime: z.string().nullable().optional(),
    ticket_id: z.number(),
    uri: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
    meta: z
        .object({
            prev_cursor: z.string().nullable().optional(),
            next_cursor: z.string().nullable().optional()
        })
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Lists satisfaction surveys from the provider.
 * @pitfalls: Surveys are not cascade-deleted when their associated ticket is removed, so listings may include orphaned records.
 */
const action = createAction({
    description: 'List satisfaction surveys, optionally filtered by ticket.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/list-satisfaction-surveys
            endpoint: '/api/satisfaction-surveys',
            params: {
                ...(input.cursor !== undefined && { cursor: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(input.ticket_id !== undefined && { ticket_id: input.ticket_id })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((raw) => {
            const survey = ProviderSurveySchema.parse(raw);
            return {
                id: survey.id,
                customer_id: survey.customer_id,
                ticket_id: survey.ticket_id,
                uri: survey.uri,
                ...(survey.body_text != null && { body_text: survey.body_text }),
                ...(survey.created_datetime != null && { created_datetime: survey.created_datetime }),
                ...(survey.meta != null && { meta: survey.meta }),
                ...(survey.score != null && { score: survey.score }),
                ...(survey.scored_datetime != null && { scored_datetime: survey.scored_datetime }),
                ...(survey.sent_datetime != null && { sent_datetime: survey.sent_datetime }),
                ...(survey.should_send_datetime != null && { should_send_datetime: survey.should_send_datetime })
            };
        });

        return {
            items,
            ...(providerResponse.meta?.next_cursor != null && { next_cursor: providerResponse.meta.next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
