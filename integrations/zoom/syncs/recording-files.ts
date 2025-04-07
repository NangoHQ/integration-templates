import type { NangoSync, ProxyConfiguration, RecordingFile, OptionalBackfillSetting } from '../../models';
import type { ZoomRecordingMeeting } from '../types';

export default async function fetchData(nango: NangoSync) {
    const today = new Date();
    let start = new Date(new Date().setMonth(today.getMonth() - 1));

    const metadata = await nango.getMetadata<OptionalBackfillSetting>();
    if (metadata?.backfillPeriodDays !== undefined) {
        const days = metadata.backfillPeriodDays;

        if (days > 30) {
            throw new Error('Backfill period cannot be greater than 30 days');
        } else if (days < 1) {
            throw new Error('Backfill period cannot be less than 1 day');
        }

        start = new Date(new Date().setDate(today.getDate() - metadata.backfillPeriodDays));
    }

    const config: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/meetings/#tag/cloud-recording/GET/users/%7BuserId%7D/recordings
        endpoint: '/users/me/recordings',
        params: {
            from: start.toISOString().split('T')?.[0] || '',
            to: today.toISOString().split('T')?.[0] || ''
        },
        retries: 10,
        paginate: {
            response_path: 'meetings'
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
