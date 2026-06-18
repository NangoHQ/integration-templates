import { z } from 'zod';
import { createAction } from 'nango';

const MetadataSchema = z.object({
    account_sid: z.string().describe('Twilio Account SID. Example: "ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"')
});

const InputSchema = z.object({
    conference_sid: z.string().describe('The SID of the conference. Example: "CFXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"'),
    call_sid: z.string().describe('The Call SID or label of the participant. Example: "CAXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"')
});

const ParticipantSchema = z.object({
    account_sid: z.string().optional(),
    call_sid: z.string().optional(),
    label: z.string().nullable().optional(),
    call_sid_to_coach: z.string().nullable().optional(),
    coaching: z.boolean().optional(),
    conference_sid: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    end_conference_on_exit: z.boolean().optional(),
    muted: z.boolean().optional(),
    hold: z.boolean().optional(),
    start_conference_on_enter: z.boolean().optional(),
    status: z.string().optional(),
    queue_time: z.string().nullable().optional(),
    uri: z.string().optional()
});

const OutputSchema = z.object({
    account_sid: z.string().optional(),
    call_sid: z.string().optional(),
    label: z.string().optional(),
    call_sid_to_coach: z.string().optional(),
    coaching: z.boolean().optional(),
    conference_sid: z.string().optional(),
    date_created: z.string().optional(),
    date_updated: z.string().optional(),
    end_conference_on_exit: z.boolean().optional(),
    muted: z.boolean().optional(),
    hold: z.boolean().optional(),
    start_conference_on_enter: z.boolean().optional(),
    status: z.string().optional(),
    queue_time: z.string().optional(),
    uri: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single participant in a Twilio conference.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata<z.infer<typeof MetadataSchema>>();
        const accountSid = metadata?.account_sid;

        if (!accountSid) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'account_sid is required in metadata.'
            });
        }

        // https://www.twilio.com/docs/voice/api/conference-participant-resource#retrieve-a-participant
        const response = await nango.get({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Conferences/${encodeURIComponent(input.conference_sid)}/Participants/${encodeURIComponent(input.call_sid)}.json`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Conference participant not found.',
                conference_sid: input.conference_sid,
                call_sid: input.call_sid
            });
        }

        const participant = ParticipantSchema.parse(response.data);

        return {
            account_sid: participant.account_sid,
            call_sid: participant.call_sid,
            label: participant.label ?? undefined,
            call_sid_to_coach: participant.call_sid_to_coach ?? undefined,
            coaching: participant.coaching,
            conference_sid: participant.conference_sid,
            date_created: participant.date_created,
            date_updated: participant.date_updated,
            end_conference_on_exit: participant.end_conference_on_exit,
            muted: participant.muted,
            hold: participant.hold,
            start_conference_on_enter: participant.start_conference_on_enter,
            status: participant.status,
            queue_time: participant.queue_time ?? undefined,
            uri: participant.uri
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
