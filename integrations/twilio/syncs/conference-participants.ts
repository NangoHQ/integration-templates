import { createSync } from 'nango';
import { z } from 'zod';

const ConferenceParticipantSchema = z.object({
    id: z.string(),
    call_sid: z.string(),
    conference_sid: z.string(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    end_conference_on_exit: z.boolean().optional(),
    hold: z.boolean().optional(),
    muted: z.boolean().optional(),
    status: z.string().optional()
});

const ConferenceSchema = z.object({
    sid: z.string(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    status: z.string().optional(),
    friendly_name: z.string().optional()
});

const ParticipantSchema = z.object({
    call_sid: z.string(),
    conference_sid: z.string(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    end_conference_on_exit: z.boolean().optional(),
    hold: z.boolean().optional(),
    muted: z.boolean().optional(),
    status: z.string().optional()
});

const MetadataSchema = z.object({
    account_sid: z.string().optional()
});

const sync = createSync({
    description: 'Sync participants across all conferences from Twilio.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        ConferenceParticipant: ConferenceParticipantSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/conference-participants'
        }
    ],

    exec: async (nango) => {
        // Blocker: Twilio conference participants are only accessible via nested endpoints
        // under each conference. There is no global endpoint that returns changed or deleted
        // participants. The Conferences list supports DateUpdated>, but combining it with
        // trackDeletesStart/trackDeletesEnd would falsely delete participants from unchanged
        // conferences because the endpoint only returns changed conferences. Therefore, full
        // refresh is required for accurate participant syncing and deletion detection.
        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata();

        let accountSid: string | undefined;
        if (
            typeof connection.credentials === 'object' &&
            connection.credentials !== null &&
            'username' in connection.credentials &&
            typeof connection.credentials.username === 'string'
        ) {
            accountSid = connection.credentials.username;
        } else if (typeof metadata === 'object' && metadata !== null && 'account_sid' in metadata && typeof metadata.account_sid === 'string') {
            accountSid = metadata.account_sid;
        }

        if (!accountSid) {
            throw new Error('Unable to determine AccountSid from credentials or metadata');
        }

        await nango.trackDeletesStart('ConferenceParticipant');

        const conferencesPaginate: {
            type: 'link';
            link_path_in_response_body: string;
            response_path: string;
            limit: number;
            limit_name_in_request: string;
        } = {
            type: 'link',
            link_path_in_response_body: 'next_page_uri',
            response_path: 'conferences',
            limit: 50,
            limit_name_in_request: 'PageSize'
        };

        // https://www.twilio.com/docs/voice/api/conference-resource
        const conferencesProxyConfig = {
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Conferences.json`,
            paginate: conferencesPaginate,
            retries: 3
        };

        for await (const conferencePage of nango.paginate(conferencesProxyConfig)) {
            for (const rawConference of conferencePage) {
                const conferenceResult = ConferenceSchema.safeParse(rawConference);
                if (!conferenceResult.success) {
                    throw new Error(`Failed to parse conference: ${conferenceResult.error.message}`);
                }
                const conferenceSid = conferenceResult.data.sid;

                const participantsPaginate: {
                    type: 'link';
                    link_path_in_response_body: string;
                    response_path: string;
                    limit: number;
                    limit_name_in_request: string;
                } = {
                    type: 'link',
                    link_path_in_response_body: 'next_page_uri',
                    response_path: 'participants',
                    limit: 50,
                    limit_name_in_request: 'PageSize'
                };

                // https://www.twilio.com/docs/voice/api/conference-participant-resource
                const participantsProxyConfig = {
                    endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Conferences/${encodeURIComponent(conferenceSid)}/Participants.json`,
                    paginate: participantsPaginate,
                    retries: 3
                };

                for await (const participantPage of nango.paginate(participantsProxyConfig)) {
                    const participants = [];
                    for (const rawParticipant of participantPage) {
                        const participantResult = ParticipantSchema.safeParse(rawParticipant);
                        if (!participantResult.success) {
                            throw new Error(`Failed to parse participant: ${participantResult.error.message}`);
                        }
                        const participant = participantResult.data;
                        participants.push({
                            id: participant.call_sid,
                            call_sid: participant.call_sid,
                            conference_sid: participant.conference_sid,
                            ...(participant.date_created != null && { date_created: participant.date_created }),
                            ...(participant.date_updated != null && { date_updated: participant.date_updated }),
                            ...(participant.end_conference_on_exit != null && { end_conference_on_exit: participant.end_conference_on_exit }),
                            ...(participant.hold != null && { hold: participant.hold }),
                            ...(participant.muted != null && { muted: participant.muted }),
                            ...(participant.status != null && { status: participant.status })
                        });
                    }

                    if (participants.length > 0) {
                        await nango.batchSave(participants, 'ConferenceParticipant');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('ConferenceParticipant');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
