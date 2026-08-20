import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        webhookId: z.string().describe('The unique identifier of the webhook to retrieve. Example: "bc692dca-69b2-48cd-9ee0-f55ebb45bb9a"')
    })
    .describe('Input parameters for retrieving a single webhook from Cal.com.');

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the webhook.'),
        userId: z.number().describe('The numeric identifier of the user who owns the webhook.'),
        subscriberUrl: z.string().describe('The URL that receives webhook event payloads.'),
        active: z.boolean().describe('Whether the webhook is currently active and sending events.'),
        payloadTemplate: z.string().optional().describe('The template string used to format the payload sent to the subscriberUrl.'),
        triggers: z.array(z.string()).describe('The list of event types that trigger this webhook.'),
        secret: z.string().optional().describe('The optional signing secret used to verify webhook deliveries.'),
        time: z.number().optional().describe('How long after the booking start time the no-show triggers are evaluated.'),
        timeUnit: z.string().optional().describe('The unit of the no-show time value, such as DAY, HOUR, or MINUTE.'),
        version: z.string().optional().describe('The payload format version of the webhook, e.g. 2021-10-20 or 2026-07-27.')
    })
    .describe('A single webhook retrieved from Cal.com.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single webhook by its ID from Cal.com.
 */
const action = createAction({
    description: 'Retrieve a single webhook from Cal.com.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['WEBHOOK_READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let response;
        // @allowTryCatch: The Nango SDK throws for non-2xx responses. Cal.com returns 404 for
        // a non-existent webhook, which we convert into a structured not_found error.
        try {
            response = await nango.get({
                // https://cal.com/docs/api-reference/v2/webhooks/get-a-webhook
                endpoint: `/webhooks/${encodeURIComponent(input.webhookId)}`,
                retries: 3
            });
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const errResponse = err.response;
                if (typeof errResponse === 'object' && errResponse !== null && 'status' in errResponse && errResponse.status === 404) {
                    throw new nango.ActionError({
                        type: 'not_found',
                        message: `Webhook ${input.webhookId} not found.`
                    });
                }
            }
            throw err;
        }

        const envelope = z
            .object({
                status: z.string(),
                data: z.unknown().optional()
            })
            .parse(response.data);

        if (envelope.status !== 'success') {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Cal.com returned a non-success status for the webhook request.'
            });
        }

        const webhook = z
            .object({
                id: z.union([z.number(), z.string()]),
                userId: z.number(),
                subscriberUrl: z.string(),
                active: z.boolean(),
                payloadTemplate: z.string().nullable(),
                triggers: z.array(z.string()),
                secret: z.string().nullable(),
                time: z.number().nullable().optional(),
                timeUnit: z.string().nullable().optional(),
                version: z.string().nullable().optional()
            })
            .parse(envelope.data);

        return {
            id: String(webhook.id),
            userId: webhook.userId,
            subscriberUrl: webhook.subscriberUrl,
            active: webhook.active,
            ...(webhook.payloadTemplate != null && { payloadTemplate: webhook.payloadTemplate }),
            triggers: webhook.triggers,
            ...(webhook.secret != null && { secret: webhook.secret }),
            ...(webhook.time != null && { time: webhook.time }),
            ...(webhook.timeUnit != null && { timeUnit: webhook.timeUnit }),
            ...(webhook.version != null && { version: webhook.version })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
