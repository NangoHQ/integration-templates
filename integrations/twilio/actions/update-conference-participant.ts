import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountSid: z.string().describe('The Account SID. Example: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'),
    conferenceSid: z.string().describe('The SID of the conference. Example: "CFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'),
    callSid: z.string().describe('The Call SID or label of the participant to update. Example: "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"'),
    muted: z.boolean().optional().describe('Whether the participant should be muted.'),
    hold: z.boolean().optional().describe('Whether the participant should be on hold.'),
    holdUrl: z.string().optional().describe('The URL for hold music when the participant is on hold.'),
    announceUrl: z.string().optional().describe('The URL for an announcement to the participant.'),
    coaching: z.boolean().optional().describe('Whether the participant is coaching another call.'),
    callSidToCoach: z.string().optional().describe('The SID of the participant being coached. Example: "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"')
});

const ProviderParticipantSchema = z.object({
    account_sid: z.string(),
    call_sid: z.string(),
    label: z.string().nullable(),
    conference_sid: z.string(),
    date_created: z.string(),
    date_updated: z.string(),
    end_conference_on_exit: z.boolean(),
    muted: z.boolean(),
    hold: z.boolean(),
    status: z.string(),
    start_conference_on_enter: z.boolean(),
    coaching: z.boolean(),
    call_sid_to_coach: z.string().nullable(),
    queue_time: z.string().nullable(),
    uri: z.string()
});

const OutputSchema = z.object({
    account_sid: z.string(),
    call_sid: z.string(),
    label: z.string().optional(),
    conference_sid: z.string(),
    date_created: z.string(),
    date_updated: z.string(),
    end_conference_on_exit: z.boolean(),
    muted: z.boolean(),
    hold: z.boolean(),
    status: z.string(),
    start_conference_on_enter: z.boolean(),
    coaching: z.boolean(),
    call_sid_to_coach: z.string().optional(),
    queue_time: z.string().optional(),
    uri: z.string()
});

const action = createAction({
    description: 'Update a participant in a Twilio conference.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-conference-participant',
        group: 'Conferences'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = new URLSearchParams();

        if (input.muted !== undefined) {
            body.append('Muted', String(input.muted));
        }
        if (input.hold !== undefined) {
            body.append('Hold', String(input.hold));
        }
        if (input.holdUrl !== undefined) {
            body.append('HoldUrl', input.holdUrl);
        }
        if (input.announceUrl !== undefined) {
            body.append('AnnounceUrl', input.announceUrl);
        }
        if (input.coaching !== undefined) {
            body.append('Coaching', String(input.coaching));
        }
        if (input.callSidToCoach !== undefined) {
            body.append('CallSidToCoach', input.callSidToCoach);
        }

        // https://www.twilio.com/docs/voice/api/conference-participant-resource#update-a-participant
        const response = await nango.post({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(input.accountSid)}/Conferences/${encodeURIComponent(input.conferenceSid)}/Participants/${encodeURIComponent(input.callSid)}.json`,
            data: body.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            retries: 3
        });

        const providerParticipant = ProviderParticipantSchema.parse(response.data);

        return {
            account_sid: providerParticipant.account_sid,
            call_sid: providerParticipant.call_sid,
            ...(providerParticipant.label != null && { label: providerParticipant.label }),
            conference_sid: providerParticipant.conference_sid,
            date_created: providerParticipant.date_created,
            date_updated: providerParticipant.date_updated,
            end_conference_on_exit: providerParticipant.end_conference_on_exit,
            muted: providerParticipant.muted,
            hold: providerParticipant.hold,
            status: providerParticipant.status,
            start_conference_on_enter: providerParticipant.start_conference_on_enter,
            coaching: providerParticipant.coaching,
            ...(providerParticipant.call_sid_to_coach != null && { call_sid_to_coach: providerParticipant.call_sid_to_coach }),
            ...(providerParticipant.queue_time != null && { queue_time: providerParticipant.queue_time }),
            uri: providerParticipant.uri
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
