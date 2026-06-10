import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    conference_sid: z.string().describe('The SID of the conference to list participants for. Example: CFXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
    muted: z.boolean().optional().describe('Whether to return only participants that are muted.'),
    hold: z.boolean().optional().describe('Whether to return only participants that are on hold.'),
    coaching: z.boolean().optional().describe('Whether to return only participants who are coaching another call.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response (next_page_uri). Omit for the first page.'),
    page_size: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('How many resources to return in each list page. The default is 50, and the maximum is 1000.')
});

const ParticipantSchema = z.object({
    account_sid: z.string(),
    call_sid: z.string(),
    label: z.string().nullable().optional(),
    conference_sid: z.string(),
    date_created: z.string(),
    date_updated: z.string(),
    end_conference_on_exit: z.boolean().optional(),
    muted: z.boolean().optional(),
    hold: z.boolean().optional(),
    status: z.string().optional(),
    start_conference_on_enter: z.boolean().optional(),
    coaching: z.boolean().optional(),
    call_sid_to_coach: z.string().nullable().optional(),
    queue_time: z.string().nullable().optional(),
    uri: z.string().optional()
});

const ProviderResponseSchema = z.object({
    participants: z.array(ParticipantSchema).optional(),
    next_page_uri: z.string().nullable().optional(),
    first_page_uri: z.string().optional(),
    previous_page_uri: z.string().nullable().optional(),
    uri: z.string().optional(),
    page: z.number().optional(),
    page_size: z.number().optional(),
    start: z.number().optional(),
    end: z.number().optional()
});

const OutputSchema = z.object({
    participants: z.array(
        z.object({
            account_sid: z.string(),
            call_sid: z.string(),
            label: z.string().optional(),
            conference_sid: z.string(),
            date_created: z.string(),
            date_updated: z.string(),
            end_conference_on_exit: z.boolean().optional(),
            muted: z.boolean().optional(),
            hold: z.boolean().optional(),
            status: z.string().optional(),
            start_conference_on_enter: z.boolean().optional(),
            coaching: z.boolean().optional(),
            call_sid_to_coach: z.string().optional(),
            queue_time: z.string().optional(),
            uri: z.string().optional()
        })
    ),
    next_page_uri: z.string().optional().describe('Pagination cursor to fetch the next page. Pass this value back as the `cursor` input.')
});

const action = createAction({
    description: 'List participants in a Twilio conference.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-conference-participants',
        group: 'Conferences'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        let accountSid: string | undefined;
        if (connection.credentials && connection.credentials.type === 'BASIC' && connection.credentials.username) {
            accountSid = connection.credentials.username;
        }
        if (!accountSid) {
            const metadata = await nango.getMetadata<Record<string, unknown>>();
            if (metadata && typeof metadata === 'object' && 'account_sid' in metadata && typeof metadata['account_sid'] === 'string') {
                accountSid = metadata['account_sid'];
            }
        }
        if (!accountSid) {
            throw new nango.ActionError({
                type: 'invalid_credentials',
                message: 'Missing Twilio Account SID in connection credentials or metadata.'
            });
        }

        const params: Record<string, string | number> = {};
        if (input.muted !== undefined) {
            params['Muted'] = input.muted ? 'true' : 'false';
        }
        if (input.hold !== undefined) {
            params['Hold'] = input.hold ? 'true' : 'false';
        }
        if (input.coaching !== undefined) {
            params['Coaching'] = input.coaching ? 'true' : 'false';
        }
        if (input.page_size !== undefined) {
            params['PageSize'] = input.page_size;
        }
        if (input.cursor) {
            const pageTokenMatch = input.cursor.match(/PageToken=([^&]+)/);
            if (pageTokenMatch && pageTokenMatch[1]) {
                params['PageToken'] = pageTokenMatch[1];
            } else {
                params['PageToken'] = input.cursor;
            }
        }

        // https://www.twilio.com/docs/voice/api/conference-participant-resource#retrieve-a-list-of-participants
        const response = await nango.get({
            endpoint: `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Conferences/${encodeURIComponent(input.conference_sid)}/Participants.json`,
            params,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const participants = parsed.participants ?? [];

        return {
            participants: participants.map((p) => ({
                account_sid: p.account_sid,
                call_sid: p.call_sid,
                ...(p.label != null && { label: p.label }),
                conference_sid: p.conference_sid,
                date_created: p.date_created,
                date_updated: p.date_updated,
                ...(p.end_conference_on_exit !== undefined && { end_conference_on_exit: p.end_conference_on_exit }),
                ...(p.muted !== undefined && { muted: p.muted }),
                ...(p.hold !== undefined && { hold: p.hold }),
                ...(p.status !== undefined && { status: p.status }),
                ...(p.start_conference_on_enter !== undefined && { start_conference_on_enter: p.start_conference_on_enter }),
                ...(p.coaching !== undefined && { coaching: p.coaching }),
                ...(p.call_sid_to_coach != null && { call_sid_to_coach: p.call_sid_to_coach }),
                ...(p.queue_time != null && { queue_time: p.queue_time }),
                ...(p.uri !== undefined && { uri: p.uri })
            })),
            ...(parsed.next_page_uri != null && { next_page_uri: parsed.next_page_uri })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
