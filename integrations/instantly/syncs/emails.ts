import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const EmailSchema = z.object({
    id: z.string(),
    timestamp_created: z.string(),
    timestamp_email: z.string().nullish(),
    message_id: z.string().nullish(),
    subject: z.string().nullish(),
    from_address_email: z.string().nullish(),
    to_address_email_list: z.string().nullish(),
    cc_address_email_list: z.string().nullish(),
    bcc_address_email_list: z.string().nullish(),
    reply_to: z.string().nullish(),
    body: z
        .object({
            text: z.string().nullish(),
            html: z.string().nullish()
        })
        .nullish(),
    organization_id: z.string().nullish(),
    campaign_id: z.string().nullish(),
    subsequence_id: z.string().nullish(),
    list_id: z.string().nullish(),
    lead: z.string().nullish(),
    lead_id: z.string().nullish(),
    eaccount: z.string().nullish(),
    ue_type: z.number().nullish(),
    step: z.string().nullish(),
    is_unread: z.number().nullish(),
    is_auto_reply: z.number().nullish(),
    reminder_ts: z.string().nullish(),
    ai_interest_value: z.number().nullish(),
    ai_assisted: z.number().nullish(),
    is_focused: z.number().nullish(),
    i_status: z.number().nullish(),
    thread_id: z.string().nullish(),
    content_preview: z.string().nullish(),
    attachment_json: z
        .object({
            files: z
                .array(
                    z.object({
                        filename: z.string(),
                        size: z.number().nullish(),
                        type: z.string().nullish(),
                        url: z.string().nullish(),
                        error: z.string().nullish()
                    })
                )
                .nullish()
        })
        .nullish(),
    from_address_json: z.unknown().nullish(),
    to_address_json: z.unknown().nullish(),
    cc_address_json: z.unknown().nullish(),
    ai_agent_id: z.string().nullish()
});

const CheckpointSchema = z.object({
    starting_after: z.string()
});

const sync = createSync({
    description: 'Sync Unibox emails.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Email: EmailSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/emails'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let startingAfter: string | undefined;
        if (checkpoint) {
            startingAfter = checkpoint.starting_after;
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/email/list-email.md
            endpoint: '/v2/emails',
            params: {
                limit: 100,
                sort_order: 'asc',
                ...(startingAfter && { starting_after: startingAfter })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'starting_after',
                cursor_path_in_response: 'next_starting_after',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    startingAfter = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const rawItems = z.array(z.unknown()).parse(page);
            const emails = [];
            for (const raw of rawItems) {
                const parsed = EmailSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse email: ${parsed.error.message}`);
                }
                emails.push(parsed.data);
            }

            if (emails.length === 0) {
                continue;
            }

            await nango.batchSave(emails, 'Email');

            if (startingAfter) {
                await nango.saveCheckpoint({ starting_after: startingAfter });
            }
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
