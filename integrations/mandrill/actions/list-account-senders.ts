import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderSenderSchema = z.object({
    address: z.string().describe('The sender email address. Example: "sender@example.com"'),
    created_at: z.string().optional().describe('UTC date string when the sender was first seen. Example: "2023-01-15 10:00:00"'),
    sent: z.number().optional().describe('Total number of messages sent by this sender.'),
    hard_bounces: z.number().optional().describe('Total number of hard bounces for this sender.'),
    soft_bounces: z.number().optional().describe('Total number of soft bounces for this sender.'),
    rejects: z.number().optional().describe('Total number of rejected messages for this sender.'),
    complaints: z.number().optional().describe('Total number of spam complaints for this sender.'),
    unsubs: z.number().optional().describe('Total number of unsubscribe requests for this sender.'),
    opens: z.number().optional().describe('Total number of times messages by this sender have been opened.'),
    clicks: z.number().optional().describe('Total number of times tracked URLs in messages by this sender have been clicked.'),
    unique_opens: z.number().optional().describe('Number of unique opens for emails sent by this sender.'),
    unique_clicks: z.number().optional().describe('Number of unique clicks for emails sent by this sender.'),
    reputation: z.number().optional().describe('Sender reputation score (0-100).')
});

const OutputSchema = z.object({
    senders: z.array(ProviderSenderSchema)
});

const action = createAction({
    description: 'List the sender email addresses (verified and unverified) that have been used on this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/users/list-account-senders/
            endpoint: '/1.0/users/senders.json',
            data: {},
            retries: 3
        });

        const senders = z.array(ProviderSenderSchema).parse(response.data);

        return {
            senders
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
