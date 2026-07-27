import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    to: z.string().optional().describe('Optional recipient email address to restrict results to messages scheduled for a specific recipient.')
});

const ProviderScheduledMessageSchema = z.object({
    _id: z.string(),
    created_at: z.string().optional(),
    send_at: z.string().optional(),
    from_email: z.string().optional(),
    to: z.string().optional(),
    subject: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            _id: z.string(),
            created_at: z.string().optional(),
            send_at: z.string().optional(),
            from_email: z.string().optional(),
            to: z.string().optional(),
            subject: z.string().optional()
        })
    )
});

const action = createAction({
    description: 'List messages that are scheduled to be sent in the future.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/messages/list-scheduled-emails/
            endpoint: '1.0/messages/list-scheduled',
            data: {
                ...(input.to !== undefined && { to: input.to })
            },
            retries: 3
        });

        const providerMessages = z.array(ProviderScheduledMessageSchema).parse(response.data);

        const items = providerMessages.map((msg) => ({
            _id: msg._id,
            ...(msg.created_at != null && { created_at: msg.created_at }),
            ...(msg.send_at != null && { send_at: msg.send_at }),
            ...(msg.from_email != null && { from_email: msg.from_email }),
            ...(msg.to != null && { to: msg.to }),
            ...(msg.subject != null && { subject: msg.subject })
        }));

        return {
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
