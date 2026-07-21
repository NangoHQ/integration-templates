import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z
        .string()
        .describe('The scheduled email id, as returned by any of the messages/send calls or messages/list-scheduled. Example: "I_dtFt2ZNPW5QD9-FaDU1A"'),
    send_at: z.string().describe('The new UTC timestamp when the message should be sent. Example: "2026-07-21 14:30:00"')
});

const ProviderResponseSchema = z.object({
    _id: z.string(),
    created_at: z.string(),
    send_at: z.string(),
    from_email: z.string(),
    to: z.string(),
    subject: z.string()
});

const OutputSchema = z.object({
    _id: z.string(),
    created_at: z.string().optional(),
    send_at: z.string().optional(),
    from_email: z.string().optional(),
    to: z.string().optional(),
    subject: z.string().optional()
});

const action = createAction({
    description: 'Change the send time of a scheduled email.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/messages/reschedule-email/
            endpoint: '/messages/reschedule.json',
            data: {
                id: input.id,
                send_at: input.send_at
            },
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            _id: providerResponse._id,
            ...(providerResponse.created_at !== undefined && { created_at: providerResponse.created_at }),
            ...(providerResponse.send_at !== undefined && { send_at: providerResponse.send_at }),
            ...(providerResponse.from_email !== undefined && { from_email: providerResponse.from_email }),
            ...(providerResponse.to !== undefined && { to: providerResponse.to }),
            ...(providerResponse.subject !== undefined && { subject: providerResponse.subject })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
