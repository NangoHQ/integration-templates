import { createSync } from 'nango';
import { z } from 'zod';
import { URL } from 'url';

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

const ConversationsPageSchema = z.object({
    conversations: z.array(ConversationSchema),
    meta: z.object({
        next_page_url: z.string().nullable().optional(),
        url: z.string().optional()
    })
});

const ParticipantsPageSchema = z.object({
    participants: z.array(z.unknown()),
    meta: z.object({
        next_page_url: z.string().nullable().optional()
    })
});

const CheckpointSchema = z.object({
    conversation_url: z.string(),
    completed_conversation_sids: z.string(),
    conversation_sid: z.string(),
    participant_url: z.string()
});

const extraProps: Record<string, unknown> = {
    endpoint: {
        path: '/syncs/participants',
        method: 'POST'
    }
};

function parseTwilioPageUrl(url: string): { endpoint: string; params: Record<string, string> } {
    const parsed = new URL(url);
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
        if (key === 'Page' && value === '0') {
            return;
        }
        params[key] = value;
    });
    return { endpoint: parsed.pathname, params };
}

function mapTwilioParticipant(p: z.infer<typeof TwilioParticipantSchema>): z.infer<typeof ParticipantSchema> {
    return {
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
    };
}

const sync = createSync({
    description: 'Sync participants across all conversations from Twilio.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Participant: ParticipantSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/participants' }],
    ...extraProps,

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        await nango.trackDeletesStart('Participant');

        const completedConversationSids = new Set((checkpoint?.data.completed_conversation_sids || '').split(',').filter((s) => s.length > 0));

        // Resume a partially-processed conversation if one exists.
        const resumeConversationSid = checkpoint?.data.conversation_sid || undefined;
        const resumeParticipantUrl = checkpoint?.data.participant_url || undefined;

        if (resumeConversationSid && resumeParticipantUrl) {
            let participantUrl: string | null = resumeParticipantUrl;
            while (participantUrl) {
                const { endpoint, params } = parseTwilioPageUrl(participantUrl);
                const response = await nango.get({
                    // https://www.twilio.com/docs/conversations/api/conversation-participant-resource
                    endpoint,
                    baseUrlOverride: 'https://conversations.twilio.com',
                    params,
                    retries: 3
                });
                const parsed = ParticipantsPageSchema.parse(response.data);

                const records: Array<z.infer<typeof ParticipantSchema>> = [];
                for (const rawParticipant of parsed.participants) {
                    const p = TwilioParticipantSchema.parse(rawParticipant);
                    records.push(mapTwilioParticipant(p));
                }

                if (records.length > 0) {
                    await nango.batchSave(records, 'Participant');
                }

                participantUrl = parsed.meta.next_page_url ?? null;

                if (participantUrl) {
                    await nango.saveCheckpoint({
                        conversation_url: checkpoint?.data.conversation_url || '',
                        completed_conversation_sids: Array.from(completedConversationSids).join(','),
                        conversation_sid: resumeConversationSid,
                        participant_url: participantUrl
                    });
                }
            }

            completedConversationSids.add(resumeConversationSid);
        }

        // Walk conversation pages.
        let conversationUrl: string | undefined = checkpoint?.data.conversation_url || undefined;

        while (true) {
            let convEndpoint: string;
            let convParams: Record<string, string>;

            if (conversationUrl) {
                const parsed = parseTwilioPageUrl(conversationUrl);
                convEndpoint = parsed.endpoint;
                convParams = parsed.params;
            } else {
                convEndpoint = '/v1/Conversations';
                convParams = { PageSize: '50' };
            }

            const convResponse = await nango.get({
                // https://www.twilio.com/docs/conversations/api/conversation-resource
                endpoint: convEndpoint,
                baseUrlOverride: 'https://conversations.twilio.com',
                params: convParams,
                retries: 3
            });
            const convParsed = ConversationsPageSchema.parse(convResponse.data);

            for (const rawConversation of convParsed.conversations) {
                const conversation = ConversationSchema.parse(rawConversation);
                const conversationSid = conversation.sid;

                if (completedConversationSids.has(conversationSid)) {
                    continue;
                }

                // https://www.twilio.com/docs/conversations/api/conversation-participant-resource
                let participantUrl: string | undefined = `/v1/Conversations/${encodeURIComponent(conversationSid)}/Participants`;
                let participantParams: Record<string, string> = { PageSize: '50' };

                while (true) {
                    const partResponse = await nango.get({
                        endpoint: participantUrl,
                        baseUrlOverride: 'https://conversations.twilio.com',
                        params: participantParams,
                        retries: 3
                    });
                    const partParsed = ParticipantsPageSchema.parse(partResponse.data);

                    const records: Array<z.infer<typeof ParticipantSchema>> = [];
                    for (const rawParticipant of partParsed.participants) {
                        const p = TwilioParticipantSchema.parse(rawParticipant);
                        records.push(mapTwilioParticipant(p));
                    }

                    if (records.length > 0) {
                        await nango.batchSave(records, 'Participant');
                    }

                    if (!partParsed.meta.next_page_url) {
                        break;
                    }

                    const next = parseTwilioPageUrl(partParsed.meta.next_page_url);
                    participantUrl = next.endpoint;
                    participantParams = next.params;

                    await nango.saveCheckpoint({
                        conversation_url: convParsed.meta.url ?? conversationUrl ?? '',
                        completed_conversation_sids: Array.from(completedConversationSids).join(','),
                        conversation_sid: conversationSid,
                        participant_url: partParsed.meta.next_page_url
                    });
                }

                completedConversationSids.add(conversationSid);

                await nango.saveCheckpoint({
                    conversation_url: convParsed.meta.url ?? conversationUrl ?? '',
                    completed_conversation_sids: Array.from(completedConversationSids).join(','),
                    conversation_sid: '',
                    participant_url: ''
                });
            }

            if (!convParsed.meta.next_page_url) {
                break;
            }

            const nextConversationUrl = convParsed.meta.next_page_url;
            await nango.saveCheckpoint({
                conversation_url: nextConversationUrl,
                completed_conversation_sids: '',
                conversation_sid: '',
                participant_url: ''
            });

            completedConversationSids.clear();
            conversationUrl = nextConversationUrl;
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Participant');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
