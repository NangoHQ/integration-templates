import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    meeting_id: z.string().describe('The meeting ID or UUID. Example: "123456789"')
});

const RecordingFileSchema = z.object({
    deleted_time: z.string().optional(),
    download_url: z.string().optional(),
    file_extension: z.string().optional(),
    file_path: z.string().optional(),
    file_size: z.number().optional(),
    file_type: z.string().optional(),
    id: z.string().optional(),
    meeting_id: z.string().optional(),
    play_url: z.string().optional(),
    recording_end: z.string().optional(),
    recording_start: z.string().optional(),
    recording_type: z.string().optional(),
    status: z.string().optional()
});

const ParticipantAudioFileSchema = z.object({
    deleted_time: z.string().optional(),
    download_url: z.string().optional(),
    file_extension: z.string().optional(),
    file_path: z.string().optional(),
    file_size: z.number().optional(),
    file_type: z.string().optional(),
    id: z.string().optional(),
    meeting_id: z.string().optional(),
    play_url: z.string().optional(),
    recording_end: z.string().optional(),
    recording_start: z.string().optional(),
    recording_type: z.string().optional(),
    status: z.string().optional()
});

const OutputSchema = z.object({
    account_id: z.string().optional(),
    duration: z.number().optional(),
    host_id: z.string().optional(),
    id: z.number().optional(),
    recording_count: z.number().optional(),
    start_time: z.string().optional(),
    topic: z.string().optional(),
    total_size: z.number().optional(),
    type: z.number().optional(),
    uuid: z.string().optional(),
    recording_files: z.array(RecordingFileSchema).optional(),
    participant_audio_files: z.array(ParticipantAudioFileSchema).optional(),
    download_access_token: z.string().optional(),
    recording_play_passcode: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single recording from Zoom.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['recording:read:admin', 'recording:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/recordingGet
        const response = await nango.get({
            endpoint: `/meetings/${encodeURIComponent(encodeURIComponent(input.meeting_id))}/recordings`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Recording not found for the given meeting ID.',
                meeting_id: input.meeting_id
            });
        }

        const raw = OutputSchema.parse(response.data);

        return {
            account_id: raw.account_id,
            duration: raw.duration,
            host_id: raw.host_id,
            id: raw.id,
            recording_count: raw.recording_count,
            start_time: raw.start_time,
            topic: raw.topic,
            total_size: raw.total_size,
            type: raw.type,
            uuid: raw.uuid,
            recording_files: raw.recording_files,
            participant_audio_files: raw.participant_audio_files,
            download_access_token: raw.download_access_token,
            recording_play_passcode: raw.recording_play_passcode
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
