import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TwilioParticipantSchema = z.object({
    account_sid: z.string(),
    conversation_sid: z.string(),
    sid: z.string(),
    identity: z.string().nullable().optional(),
    attributes: z.string().nullable().optional(),
    messaging_binding: z
        .object({
            type: z.string().nullable().optional(),
            address: z.string().nullable().optional(),
            proxy_address: z.string().nullable().optional()
        })
        .nullable()
        .optional(),
    role_sid: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_updated: z.string().nullable().optional(),
    url: z.string().nullable().optional()
});

const ParticipantSchema = z.object({
    id: z.string(),
    conversation_sid: z.string(),
    account_sid: z.string(),
    identity: z.string().optional(),
    attributes: z.string().optional(),
    messaging_binding: z
        .object({
            type: z.string().optional(),
            address: z.string().optional(),
            proxy_address: z.string().optional()
        })
        .optional(),
    role_sid: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    url: z.string().optional()
});

const ConversationSchema = z.object({
    sid: z.string()
});

const extraProps: Record<string, unknown> = {
    endpoint: {
        path: '/syncs/participants',
        method: 'POST'
    }
};

const sync = createSync({
    description: 'Sync participants across all conversations from Twilio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Participant: ParticipantSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/participants' }],
    ...extraProps,

    exec: async (nango) => {
        // Blocker: conversation participants are only available from nested per-conversation
        // endpoints. The Conversations list can filter by creation date, but it cannot filter by
        // participant updates or deletions in older conversations, so a checkpointed delta sync
        // would miss changes. A full refresh with deletion detection is required here.

        await nango.trackDeletesStart('Participant');

        const conversationsConfig: ProxyConfiguration = {
            // https://www.twilio.com/docs/conversations/api/conversation-resource
            endpoint: '/v1/Conversations',
            baseUrlOverride: 'https://conversations.twilio.com',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'meta.next_page_url',
                response_path: 'conversations',
                limit: 50,
                limit_name_in_request: 'PageSize'
            },
            retries: 3
        };

        for await (const conversationBatch of nango.paginate<unknown>(conversationsConfig)) {
            for (const rawConversation of conversationBatch) {
                const conversation = ConversationSchema.parse(rawConversation);
                const conversationSid = conversation.sid;

                const participantsConfig: ProxyConfiguration = {
                    // https://www.twilio.com/docs/conversations/api/conversation-participant-resource
                    endpoint: `/v1/Conversations/${encodeURIComponent(conversationSid)}/Participants`,
                    baseUrlOverride: 'https://conversations.twilio.com',
                    paginate: {
                        type: 'link',
                        link_path_in_response_body: 'meta.next_page_url',
                        response_path: 'participants',
                        limit: 50,
                        limit_name_in_request: 'PageSize'
                    },
                    retries: 3
                };

                for await (const participantBatch of nango.paginate<unknown>(participantsConfig)) {
                    const records: Array<z.infer<typeof ParticipantSchema>> = [];
                    for (const rawParticipant of participantBatch) {
                        const p = TwilioParticipantSchema.parse(rawParticipant);
                        records.push({
                            id: p.sid,
                            conversation_sid: p.conversation_sid,
                            account_sid: p.account_sid,
                            ...(p.identity != null && { identity: p.identity }),
                            ...(p.attributes != null && { attributes: p.attributes }),
                            ...(p.messaging_binding != null && {
                                messaging_binding: {
                                    ...(p.messaging_binding.type != null && { type: p.messaging_binding.type }),
                                    ...(p.messaging_binding.address != null && { address: p.messaging_binding.address }),
                                    ...(p.messaging_binding.proxy_address != null && { proxy_address: p.messaging_binding.proxy_address })
                                }
                            }),
                            ...(p.role_sid != null && { role_sid: p.role_sid }),
                            ...(p.date_created != null && { date_created: p.date_created }),
                            ...(p.date_updated != null && { date_updated: p.date_updated }),
                            ...(p.url != null && { url: p.url })
                        });
                    }
                    if (records.length > 0) {
                        await nango.batchSave(records, 'Participant');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('Participant');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
