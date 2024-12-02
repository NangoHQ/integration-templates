import type { NangoSync, ProxyConfiguration, RecordingFile } from '../../models';
import type { ZoomRecordingMeeting } from '../types';

export default async function fetchData(nango: NangoSync) {
    const today = new Date();
    const monthAgo = new Date(new Date().setMonth(today.getMonth() - 1));

    const config: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/meetings/#tag/cloud-recording/GET/users/%7BuserId%7D/recordings
        endpoint: '/users/me/recordings',
        params: {
            from: monthAgo.toISOString().split('T')?.[0] || '',
            to: today.toISOString().split('T')?.[0] || ''
        },
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'next_page_token',
            cursor_path_in_response: 'next_page_token',
            response_path: 'meetings',
            limit_name_in_request: 'page_size'
        }
    };

    const recordings: RecordingFile[] = [];

    for await (const zMeetings of nango.paginate<ZoomRecordingMeeting>(config)) {
        for (const meeting of zMeetings) {
            for (const recording of meeting.recording_files) {
                recordings.push({
                    id: recording.id,
                    deletedTime: recording.deleted_time,
                    downloadUrl: recording.download_url,
                    filePath: recording.file_path,
                    fileSize: recording.file_size,
                    fileType: recording.file_type,
                    fileExtension: recording.file_extension,
                    meetingId: recording.meeting_id,
                    playUrl: recording.play_url,
                    recordingEnd: recording.recording_end,
                    recordingStart: recording.recording_start,
                    recordingType: recording.recording_type,
                    status: recording.status,
                    autoDelete: meeting.auto_delete,
                    autoDeleteDate: meeting.auto_delete_date,
                    playPasscode: meeting.recording_play_passcode
                });
            }
        }
    }

    await nango.batchSave(recordings, 'RecordingFile');
}
