import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the satisfaction survey.')
    })
    .describe('Input for retrieving a single satisfaction survey.');

const ProviderSatisfactionSurveySchema = z.object({
    id: z.number(),
    ticket_id: z.number().nullish(),
    customer_id: z.number().nullish(),
    score: z.number().nullish(),
    sent_datetime: z.string().nullish(),
    scored_datetime: z.string().nullish(),
    should_send_datetime: z.string().nullish(),
    created_datetime: z.string().nullish(),
    updated_datetime: z.string().nullish()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique identifier of the satisfaction survey.'),
        ticket_id: z.number().nullable().describe('The ID of the ticket associated with this survey.'),
        customer_id: z.number().nullable().describe('The ID of the customer associated with this survey.'),
        score: z.number().nullable().describe('The satisfaction score given by the customer.'),
        sent_datetime: z.string().nullable().describe('The ISO 8601 datetime when the survey was sent.'),
        scored_datetime: z.string().nullable().describe('The ISO 8601 datetime when the customer submitted a score.'),
        should_send_datetime: z.string().nullable().describe('The ISO 8601 datetime when the survey is scheduled to be sent.'),
        created_datetime: z.string().nullable().describe('The ISO 8601 datetime when the survey was created.'),
        updated_datetime: z.string().nullable().describe('The ISO 8601 datetime when the survey was last updated.')
    })
    .describe('A single satisfaction survey with its current state and metadata.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single satisfaction survey from the provider.
 * @pitfalls: Surveys may remain accessible even after their associated ticket is deleted, and most fields are null until the survey is actually sent and scored.
 */
const action = createAction({
    description: 'Retrieve a single satisfaction survey.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['satisfaction-surveys:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.gorgias.com/reference/get-satisfaction-survey
            endpoint: `/api/satisfaction-surveys/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Satisfaction survey with id ${input.id} not found.`
            });
        }

        const survey = ProviderSatisfactionSurveySchema.parse(response.data);

        return {
            id: survey.id,
            ticket_id: survey.ticket_id ?? null,
            customer_id: survey.customer_id ?? null,
            score: survey.score ?? null,
            sent_datetime: survey.sent_datetime ?? null,
            scored_datetime: survey.scored_datetime ?? null,
            should_send_datetime: survey.should_send_datetime ?? null,
            created_datetime: survey.created_datetime ?? null,
            updated_datetime: survey.updated_datetime ?? null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
