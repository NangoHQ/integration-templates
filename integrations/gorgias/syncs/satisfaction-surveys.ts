import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSatisfactionSurveySchema = z.object({
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

const SatisfactionSurveySchema = z
    .object({
        id: z.string().describe('The unique identifier of the satisfaction survey.'),
        body_text: z.string().optional().describe('The comment sent by the customer.'),
        created_datetime: z.string().optional().describe('When the survey was created.'),
        customer_id: z.number().describe('The ID of the customer who filled the survey.'),
        meta: z.record(z.string(), z.unknown()).optional().describe('Structured key-value data associated with the satisfaction survey. Not used by Gorgias.'),
        score: z.number().optional().describe('The level of satisfaction, ranging from 1 to 5.'),
        scored_datetime: z.string().optional().describe('When the survey was filled by the customer.'),
        sent_datetime: z.string().optional().describe('When the survey was sent. Omitted if it was not sent yet.'),
        should_send_datetime: z.string().optional().describe('When the survey should be sent. Omitted if Gorgias will not send the survey.'),
        ticket_id: z.number().describe('The ID of the ticket the survey is associated with.'),
        uri: z.string().describe('URI of the survey.')
    })
    .describe('A satisfaction survey measuring customer support quality.');

const sync = createSync({
    description: 'Sync satisfaction surveys.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        SatisfactionSurvey: SatisfactionSurveySchema
    },

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://developers.gorgias.com/reference/list-satisfaction-surveys
            endpoint: '/api/satisfaction-surveys',
            params: {
                order_by: 'created_datetime:desc'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'meta.next_cursor',
                cursor_name_in_request: 'cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        await nango.trackDeletesStart('SatisfactionSurvey');

        for await (const page of nango.paginate(proxyConfig)) {
            const validatedPage = z.array(ProviderSatisfactionSurveySchema).safeParse(page);
            if (!validatedPage.success) {
                throw new Error(`Invalid satisfaction survey data: ${validatedPage.error.message}`);
            }

            const surveys = validatedPage.data.map((survey) => ({
                id: String(survey.id),
                ...(survey.body_text != null && { body_text: survey.body_text }),
                ...(survey.created_datetime != null && { created_datetime: survey.created_datetime }),
                customer_id: survey.customer_id,
                ...(survey.meta != null && { meta: survey.meta }),
                ...(survey.score != null && { score: survey.score }),
                ...(survey.scored_datetime != null && { scored_datetime: survey.scored_datetime }),
                ...(survey.sent_datetime != null && { sent_datetime: survey.sent_datetime }),
                ...(survey.should_send_datetime != null && { should_send_datetime: survey.should_send_datetime }),
                ticket_id: survey.ticket_id,
                uri: survey.uri
            }));

            if (surveys.length > 0) {
                await nango.batchSave(surveys, 'SatisfactionSurvey');
            }
        }

        await nango.trackDeletesEnd('SatisfactionSurvey');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
