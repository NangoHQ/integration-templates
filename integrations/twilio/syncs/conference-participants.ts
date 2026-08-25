import { createSync } from 'nango';
import { z } from 'zod';
import { URL } from 'url';

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

const ConferenceListSchema = z.object({
    conferences: z.array(z.unknown()),
    next_page_uri: z.string().nullable(),
    uri: z.string()
});

const ParticipantListSchema = z.object({
    participants: z.array(z.unknown()),
    next_page_uri: z.string().nullable(),
    uri: z.string()
});

const CheckpointSchema = z.object({
    conference_uri: z.string(),
    current_conference_sid: z.string(),
    participant_uri: z.string()
});

function parseTwilioPageUrl(url: string): { endpoint: string; params: Record<string, string> } {
    const parsed = new URL(url, 'https://api.twilio.com');
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return { endpoint: parsed.pathname, params };
}

const sync = createSync({
    description: 'Sync participants across all conferences from Twilio.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
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
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw == null ? undefined : CheckpointSchema.safeParse(checkpointRaw);
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

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

        let conferenceUri = checkpoint?.data.conference_uri || '';
        let currentConferenceSid = checkpoint?.data.current_conference_sid || '';
        let participantUri = checkpoint?.data.participant_uri || '';

        // https://www.twilio.com/docs/voice/api/conference-resource
        while (true) {
            let confEndpoint: string;
            let confParams: Record<string, string>;

            if (conferenceUri) {
                const parsed = parseTwilioPageUrl(conferenceUri);
                confEndpoint = parsed.endpoint;
                confParams = parsed.params;
            } else {
                confEndpoint = `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Conferences.json`;
                confParams = { PageSize: '50' };
            }

            const conferencesResponse = await nango.get({
                endpoint: confEndpoint,
                params: confParams,
                retries: 3
            });

            const conferencesResult = ConferenceListSchema.safeParse(conferencesResponse.data);
            if (!conferencesResult.success) {
                throw new Error(`Failed to parse conferences list: ${conferencesResult.error.message}`);
            }

            const conferencesData = conferencesResult.data;
            const conferences = conferencesData.conferences;
            const nextConferenceUri = conferencesData.next_page_uri ?? '';

            const resumeIndex = currentConferenceSid
                ? conferences.findIndex((raw) => {
                      const parsed = ConferenceSchema.safeParse(raw);
                      return parsed.success && parsed.data.sid === currentConferenceSid;
                  })
                : -1;

            const startIndex = resumeIndex >= 0 ? resumeIndex : 0;

            for (let i = startIndex; i < conferences.length; i++) {
                const rawConference = conferences[i];
                const conferenceResult = ConferenceSchema.safeParse(rawConference);
                if (!conferenceResult.success) {
                    throw new Error(`Failed to parse conference: ${conferenceResult.error.message}`);
                }
                const conferenceSid = conferenceResult.data.sid;

                const resumeParticipantUri = i === resumeIndex && participantUri ? participantUri : '';

                // https://www.twilio.com/docs/voice/api/conference-participant-resource
                let participantPageUri = resumeParticipantUri;
                while (true) {
                    let partEndpoint: string;
                    let partParams: Record<string, string>;

                    if (participantPageUri) {
                        const parsed = parseTwilioPageUrl(participantPageUri);
                        partEndpoint = parsed.endpoint;
                        partParams = parsed.params;
                    } else {
                        partEndpoint = `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Conferences/${encodeURIComponent(conferenceSid)}/Participants.json`;
                        partParams = { PageSize: '50' };
                    }

                    const participantsResponse = await nango.get({
                        endpoint: partEndpoint,
                        params: partParams,
                        retries: 3
                    });

                    const participantsResult = ParticipantListSchema.safeParse(participantsResponse.data);
                    if (!participantsResult.success) {
                        throw new Error(`Failed to parse participants list: ${participantsResult.error.message}`);
                    }

                    const participantsData = participantsResult.data;
                    const participants = participantsData.participants;
                    const nextParticipantUri = participantsData.next_page_uri ?? '';

                    const mappedParticipants = [];
                    for (const rawParticipant of participants) {
                        const participantResult = ParticipantSchema.safeParse(rawParticipant);
                        if (!participantResult.success) {
                            throw new Error(`Failed to parse participant: ${participantResult.error.message}`);
                        }
                        const participant = participantResult.data;
                        mappedParticipants.push({
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

                    if (mappedParticipants.length > 0) {
                        await nango.batchSave(mappedParticipants, 'ConferenceParticipant');
                    }

                    if (!nextParticipantUri) {
                        break;
                    }

                    await nango.saveCheckpoint({
                        conference_uri: conferencesData.uri,
                        current_conference_sid: conferenceSid,
                        participant_uri: nextParticipantUri
                    });

                    participantPageUri = nextParticipantUri;
                }

                await nango.saveCheckpoint({
                    conference_uri: conferencesData.uri,
                    current_conference_sid: conferenceSid,
                    participant_uri: ''
                });
            }

            if (!nextConferenceUri) {
                break;
            }

            conferenceUri = nextConferenceUri;
            currentConferenceSid = '';
            participantUri = '';

            await nango.saveCheckpoint({
                conference_uri: conferenceUri,
                current_conference_sid: '',
                participant_uri: ''
            });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ConferenceParticipant');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
