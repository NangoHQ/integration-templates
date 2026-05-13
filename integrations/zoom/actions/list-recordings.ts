import { z } from 'zod';
import { createAction } from 'nango';

const ProviderRecordingFileSchema = z.object({
    id: z.string().optional(),
    meeting_id: z.string().optional(),
    recording_start: z.string().optional(),
    recording_end: z.string().optional(),
    file_type: z.string().optional(),
    file_size: z.number().optional(),
    play_url: z.string().optional(),
    download_url: z.string().optional(),
    recording_type: z.string().optional(),
    status: z.string().optional(),
    deleted_time: z.string().optional()
});

const ProviderMeetingRecordingSchema = z.object({
    id: z.string(),
    uuid: z.string().optional(),
    account_id: z.string().optional(),
    host_id: z.string().optional(),
    topic: z.string().optional(),
    type: z.string().optional(),
    start_time: z.string().optional(),
    duration: z.number().optional(),
    total_size: z.union([z.string(), z.number()]).optional(),
    recording_count: z.union([z.string(), z.number()]).optional(),
    share_url: z.string().optional(),
    timezone: z.string().optional(),
    recording_files: z.array(ProviderRecordingFileSchema).optional()
});

const ProviderResponseSchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    meetings: z.array(ProviderMeetingRecordingSchema).optional(),
    next_page_token: z.string().nullable().optional(),
    page_count: z.number().optional(),
    page_size: z.number().optional(),
    total_records: z.number().optional()
});

const InputSchema = z.object({
    user_id: z.string().describe('The user ID or email address of the user. For user-level apps, pass "me" as the value for userId.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Maps to next_page_token.'),
    page_size: z.number().optional().describe('The number of records returned within a single API call. Max 300.'),
    from: z.string().optional().describe("The start date in 'yyyy-mm-dd' UTC format."),
    to: z.string().optional().describe("The end date in 'yyyy-mm-dd' UTC format."),
    trash: z.boolean().optional().describe('Query trash. true: List recordings from trash.'),
    trash_type: z.string().optional().describe('The type of Cloud recording to retrieve from the trash.')
});

const RecordingFileSchema = z.object({
    id: z.string().optional(),
    meeting_id: z.string().optional(),
    recording_start: z.string().optional(),
    recording_end: z.string().optional(),
    file_type: z.string().optional(),
    file_size: z.number().optional(),
    play_url: z.string().optional(),
    download_url: z.string().optional(),
    recording_type: z.string().optional(),
    status: z.string().optional(),
    deleted_time: z.string().optional()
});

const MeetingRecordingSchema = z.object({
    id: z.string(),
    uuid: z.string().optional(),
    account_id: z.string().optional(),
    host_id: z.string().optional(),
    topic: z.string().optional(),
    type: z.string().optional(),
    start_time: z.string().optional(),
    duration: z.number().optional(),
    total_size: z.string().optional(),
    recording_count: z.string().optional(),
    share_url: z.string().optional(),
    timezone: z.string().optional(),
    recording_files: z.array(RecordingFileSchema).optional()
});

const OutputSchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    meetings: z.array(MeetingRecordingSchema),
    next_page_token: z.string().optional(),
    page_count: z.number().optional(),
    page_size: z.number().optional(),
    total_records: z.number().optional()
});

const action = createAction({
    description: 'List recordings from Zoom.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-recordings',
        group: 'Recordings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['recording:read:admin', 'recording:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: { next_page_token?: string; page_size?: number; from?: string; to?: string; trash?: string; trash_type?: string } = {};
        if (input.cursor !== undefined) {
            params['next_page_token'] = input.cursor;
        }
        if (input.page_size !== undefined) {
            params['page_size'] = input.page_size;
        }
        if (input.from !== undefined) {
            params['from'] = input.from;
        }
        if (input.to !== undefined) {
            params['to'] = input.to;
        }
        if (input.trash !== undefined) {
            params['trash'] = String(input.trash);
        }
        if (input.trash_type !== undefined) {
            params['trash_type'] = input.trash_type;
        }

        // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/recordingsList
        const response = await nango.get({
            endpoint: `/users/${input.user_id}/recordings`,
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'No recordings data returned from Zoom.',
                user_id: input.user_id
            });
        }

        const raw = ProviderResponseSchema.parse(response.data);

        return {
            ...(raw.from !== undefined && { from: raw.from }),
            ...(raw.to !== undefined && { to: raw.to }),
            meetings: (raw.meetings ?? []).map((meeting) => ({
                id: meeting.id,
                ...(meeting.uuid !== undefined && { uuid: meeting.uuid }),
                ...(meeting.account_id !== undefined && { account_id: meeting.account_id }),
                ...(meeting.host_id !== undefined && { host_id: meeting.host_id }),
                ...(meeting.topic !== undefined && { topic: meeting.topic }),
                ...(meeting.type !== undefined && { type: meeting.type }),
                ...(meeting.start_time !== undefined && { start_time: meeting.start_time }),
                ...(meeting.duration !== undefined && { duration: meeting.duration }),
                ...(meeting.total_size !== undefined && { total_size: String(meeting.total_size) }),
                ...(meeting.recording_count !== undefined && { recording_count: String(meeting.recording_count) }),
                ...(meeting.share_url !== undefined && { share_url: meeting.share_url }),
                ...(meeting.timezone !== undefined && { timezone: meeting.timezone }),
                ...(meeting.recording_files !== undefined && {
                    recording_files: meeting.recording_files.map((file) => ({
                        ...(file.id !== undefined && { id: file.id }),
                        ...(file.meeting_id !== undefined && { meeting_id: file.meeting_id }),
                        ...(file.recording_start !== undefined && { recording_start: file.recording_start }),
                        ...(file.recording_end !== undefined && { recording_end: file.recording_end }),
                        ...(file.file_type !== undefined && { file_type: file.file_type }),
                        ...(file.file_size !== undefined && { file_size: file.file_size }),
                        ...(file.play_url !== undefined && { play_url: file.play_url }),
                        ...(file.download_url !== undefined && { download_url: file.download_url }),
                        ...(file.recording_type !== undefined && { recording_type: file.recording_type }),
                        ...(file.status !== undefined && { status: file.status }),
                        ...(file.deleted_time !== undefined && { deleted_time: file.deleted_time })
                    }))
                })
            })),
            ...(raw.next_page_token != null && { next_page_token: raw.next_page_token }),
            ...(raw.page_count !== undefined && { page_count: raw.page_count }),
            ...(raw.page_size !== undefined && { page_size: raw.page_size }),
            ...(raw.total_records !== undefined && { total_records: raw.total_records })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
