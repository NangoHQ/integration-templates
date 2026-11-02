import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MeetingRecapAttendeeSchema = z.object({
    name: z.string().describe('Participant display name.'),
    email: z.string().describe('Participant email.'),
    isHost: z.boolean().describe('Whether this participant hosts the meeting.')
});

const MeetingRecapSchema = z
    .object({
        id: z.string().describe('Canonical meeting-recap URI and record identity.'),
        name: z.string().nullable().optional().describe('Meeting name when supplied.'),
        endAt: z.iso.datetime({ offset: true }).nullable().optional().describe('Scheduled end instant normalized to UTC Z.'),
        appUrl: z.string().describe('Calendly web-app URL requiring authorized recap access.'),
        status: z.string().describe('Recap availability state normalized to lowercase.'),
        eventId: z.string().nullable().optional().describe('Calendly event URI; null for external meetings, omitted if not supplied.'),
        startAt: z.iso.datetime({ offset: true }).nullable().optional().describe('Scheduled start instant normalized to UTC Z.'),
        shareUrl: z.string().nullable().optional().describe('Recap share link subject to its sharing settings.'),
        attendees: z.array(MeetingRecapAttendeeSchema).nullable().optional().describe('Tracked participants; retain null and empty distinctly.'),
        createdAt: z.iso
            .datetime({ offset: true })
            .nullable()
            .optional()
            .describe('Recap creation instant from the detail resource, not the tracked-meeting list timestamp.'),
        updatedAt: z.iso.datetime({ offset: true }).nullable().optional().describe('Recap modification instant from the detail resource.'),
        transcriptId: z.string().nullable().optional().describe('Canonical transcript reference, not transcript content.'),
        summaryMarkdown: z.string().nullable().optional().describe('Summary text in Markdown; null, empty and absent remain distinct.'),
        discussionMarkdown: z.string().nullable().optional().describe('Discussion text in Markdown; omitted when unavailable.'),
        actionItemsMarkdown: z.string().nullable().optional().describe('Action items text in Markdown; omitted when unavailable.')
    })
    .describe('A Calendly meeting recap with availability state, Markdown notes, meeting references and participants, including external meetings.');

type MeetingRecapRecord = z.infer<typeof MeetingRecapSchema>;

// Internal provider payload schemas; the public record contract is MeetingRecapSchema above.
const CalendlyAttendeeSchema = z.object({
    host: z.boolean(),
    user_email: z.string(),
    user_name: z.string()
});

const CalendlyRecapListItemSchema = z.object({
    uri: z.string(),
    name: z.string().nullish(),
    event: z.string().nullish(),
    status: z.string(),
    app_url: z.string(),
    start_time: z.string().nullish(),
    end_time: z.string().nullish(),
    attendees: z.array(CalendlyAttendeeSchema).nullish(),
    transcript: z.string().nullish()
});

const CalendlyRecapDetailSchema = z.object({
    created_at: z.string().nullish(),
    updated_at: z.string().nullish(),
    summary_md: z.string().nullish(),
    discussion_md: z.string().nullish(),
    action_items_md: z.string().nullish(),
    share_link: z.string().nullish()
});

const CalendlyRecapDetailResponseSchema = z.object({
    resource: CalendlyRecapDetailSchema
});

type CalendlyRecapDetail = z.infer<typeof CalendlyRecapDetailSchema>;

/**
 * Normalize an ISO 8601 date-time to UTC `Z` while retaining the original fractional-second
 * precision, which a plain `Date#toISOString()` would truncate to milliseconds.
 */
function normalizeToUtcIso(value: string): string {
    const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match) {
        throw new Error(`Invalid ISO 8601 date-time value: ${value}`);
    }
    const [, datePart, timePart, fractionPart, offsetPart] = match;
    if (!datePart || !timePart || !offsetPart) {
        throw new Error(`Invalid ISO 8601 date-time value: ${value}`);
    }
    const fraction = fractionPart ?? '';
    if (offsetPart === 'Z') {
        return `${datePart}T${timePart}${fraction}Z`;
    }
    const millisecondFraction = fraction.length > 4 ? fraction.slice(0, 4) : fraction;
    const base = new Date(`${datePart}T${timePart}${millisecondFraction}${offsetPart}`);
    if (Number.isNaN(base.getTime())) {
        throw new Error(`Invalid ISO 8601 date-time value: ${value}`);
    }
    return `${base.toISOString().slice(0, 19)}${fraction}Z`;
}

/** Map detail-resource fields, keeping absent keys, explicit null and empty text distinct. */
function mapDetailFields(detail: CalendlyRecapDetail): Partial<MeetingRecapRecord> {
    return {
        ...(detail.created_at !== undefined ? { createdAt: detail.created_at === null ? null : normalizeToUtcIso(detail.created_at) } : {}),
        ...(detail.updated_at !== undefined ? { updatedAt: detail.updated_at === null ? null : normalizeToUtcIso(detail.updated_at) } : {}),
        ...(detail.summary_md !== undefined ? { summaryMarkdown: detail.summary_md } : {}),
        ...(detail.discussion_md !== undefined ? { discussionMarkdown: detail.discussion_md } : {}),
        ...(detail.action_items_md !== undefined ? { actionItemsMarkdown: detail.action_items_md } : {}),
        ...(detail.share_link !== undefined ? { shareUrl: detail.share_link } : {})
    };
}

const sync = createSync({
    description:
        'Make accessible meeting recaps available as records with availability state, Markdown notes, meeting references and participants, including external meetings.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['meeting_recaps:read'],
    models: {
        MeetingRecap: MeetingRecapSchema
    },

    exec: async (nango) => {
        // Full refresh: the list endpoint cannot filter recaps by record modification time
        // (start_time/end_time filter on the meeting schedule, which does not move when a recap
        // becomes available or gains content) and there is no deleted-records feed, so every run
        // walks the whole accessible dataset from the first page and delete tracking handles
        // recaps that disappeared.
        await nango.trackDeletesStart('MeetingRecap');
        await nango.setMergingStrategy({ strategy: 'override' }, 'MeetingRecap');

        // Recap notes and recap-level timestamps live on the detail resource, which the provider
        // documents as returning the recap only while it is available.
        const fetchDetail = async (uri: string): Promise<CalendlyRecapDetail> => {
            const uuid = uri.split('/').pop();
            if (!uuid) {
                throw new Error(`Unable to derive meeting recap uuid from uri: ${uri}`);
            }
            // https://developer.calendly.com/api-docs/calendly-api/notetaker/get-meeting-recaps-uuid-recap
            const response = await nango.get<unknown>({
                endpoint: `/meeting_recaps/${encodeURIComponent(uuid)}`,
                retries: 3
            });
            return CalendlyRecapDetailResponseSchema.parse(response.data).resource;
        };

        // Without a `status` filter the list endpoint returns Available recaps only, so every
        // documented availability state is listed explicitly to cover the full dataset.
        const statusFilters = ['available', 'processing', 'unavailable'];

        for (const statusFilter of statusFilters) {
            const proxyConfig: ProxyConfiguration = {
                // https://developer.calendly.com/api-docs/calendly-api/notetaker/list-meeting-recaps
                endpoint: '/meeting_recaps',
                params: {
                    status: statusFilter
                },
                paginate: {
                    type: 'cursor',
                    cursor_name_in_request: 'page_token',
                    cursor_path_in_response: 'pagination.next_page_token',
                    response_path: 'collection',
                    limit_name_in_request: 'count',
                    limit: 100
                },
                retries: 3
            };

            for await (const page of nango.paginate<unknown>(proxyConfig)) {
                const records: MeetingRecapRecord[] = [];

                for (const raw of page) {
                    // Parse failures must throw inside a delete-tracked scan: a skipped record
                    // would be reported as deleted at the end of the run.
                    const item = CalendlyRecapListItemSchema.parse(raw);
                    const status = item.status.toLowerCase();
                    const detail = status === 'available' ? await fetchDetail(item.uri) : undefined;

                    records.push({
                        id: item.uri,
                        appUrl: item.app_url,
                        status,
                        ...(item.name !== undefined ? { name: item.name } : {}),
                        ...(item.event !== undefined ? { eventId: item.event } : {}),
                        ...(item.start_time !== undefined ? { startAt: item.start_time === null ? null : normalizeToUtcIso(item.start_time) } : {}),
                        ...(item.end_time !== undefined ? { endAt: item.end_time === null ? null : normalizeToUtcIso(item.end_time) } : {}),
                        ...(item.attendees !== undefined
                            ? {
                                  attendees:
                                      item.attendees === null
                                          ? null
                                          : item.attendees.map((attendee) => ({
                                                name: attendee.user_name,
                                                email: attendee.user_email,
                                                isHost: attendee.host
                                            }))
                              }
                            : {}),
                        ...(item.transcript !== undefined ? { transcriptId: item.transcript } : {}),
                        ...(detail !== undefined ? mapDetailFields(detail) : {})
                    });
                }

                if (records.length > 0) {
                    await nango.batchSave(records, 'MeetingRecap');
                }
            }
        }

        await nango.trackDeletesEnd('MeetingRecap');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
