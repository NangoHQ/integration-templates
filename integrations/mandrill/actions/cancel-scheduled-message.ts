import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The scheduled message ID to cancel. Example: "5a1b2c3d4e5f678901234567"')
});

const ProviderScheduledEmailSchema = z.object({
    _id: z.string(),
    created_at: z.string().optional(),
    send_at: z.string().optional(),
    from_email: z.string().optional(),
    to: z.string().optional(),
    subject: z.string().optional()
});

const ProviderResponseSchema = z.union([z.array(ProviderScheduledEmailSchema), ProviderScheduledEmailSchema]);

const OutputSchema = z.object({
    canceled: z.array(
        z.object({
            id: z.string(),
            created_at: z.string().optional(),
            send_at: z.string().optional(),
            from_email: z.string().optional(),
            to: z.string().optional(),
            subject: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'Cancel a scheduled email before it sends.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/messages/cancel-scheduled-email/
            endpoint: '1.0/messages/cancel-scheduled.json',
            data: {
                id: input.id
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'The API returned an unexpected response shape.',
                details: parsed.error.issues
            });
        }

        const items = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
        return {
            canceled: items.map((item) => ({
                id: item._id,
                ...(item.created_at !== undefined && { created_at: item.created_at }),
                ...(item.send_at !== undefined && { send_at: item.send_at }),
                ...(item.from_email !== undefined && { from_email: item.from_email }),
                ...(item.to !== undefined && { to: item.to }),
                ...(item.subject !== undefined && { subject: item.subject })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
