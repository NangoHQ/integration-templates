import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    daysHistory: z.number().int().min(1).max(30).describe('Number of days of webhook history to retrieve. Timetastic retains 30 days. Example: 7')
});

const WebhookEventSchema = z.object({
    id: z.number().int(),
    organisationId: z.number().int(),
    recordId: z.number().int(),
    userId: z.number().int(),
    retryCount: z.number().int(),
    eventType: z.enum(['TestEvent', 'AbsenceRequested', 'AbsenceApproved', 'AbsenceDeclined', 'AbsenceCancelled', 'AbsenceBooked', 'AbsenceUpdated']),
    expiresAt: z.string(),
    timestamp: z.string(),
    isProcessed: z.boolean(),
    lastProcessedAt: z.string().nullable().optional(),
    lastResponseCode: z.number().int(),
    lastResponseDetail: z.string().nullable().optional(),
    nextAttempt: z.string(),
    url: z.string().nullable().optional(),
    type: z.string()
});

const OutputSchema = z.object({
    events: z.array(WebhookEventSchema)
});

const action = createAction({
    description: 'List recent webhook delivery events.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://timetastic.co.uk/api/
            endpoint: `/webhooks/list/${encodeURIComponent(String(input.daysHistory))}`,
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of webhook events from the provider.'
            });
        }

        const events = response.data.map((item: unknown) => {
            const parsed = WebhookEventSchema.safeParse(item);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Provider returned a webhook event with unexpected structure.',
                    details: parsed.error.issues
                });
            }
            return parsed.data;
        });

        return { events };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
