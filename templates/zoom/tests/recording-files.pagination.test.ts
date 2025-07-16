import { NangoSync, ProxyConfiguration } from "nango";
import { describe, it, expect, beforeEach } from 'vitest';
import type { RecordingFile, OptionalBackfillSetting } from ../models.js;
import type { ZoomRecordingMeeting, ZoomRecordingFile } from '../types.js';

class MockNango {
    private mockMetadata: OptionalBackfillSetting | undefined;
    private currentEndpoint: string | undefined;
    private savedRecordings: RecordingFile[] = [];
    private pageCount: number = 0;
    private logMessages: string[] = [];

    async getMetadata<T>(): Promise<T | undefined> {
        return this.mockMetadata as T | undefined;
    }

    setMockMetadata(metadata: OptionalBackfillSetting | undefined) {
        this.mockMetadata = metadata;
    }

    async *paginate<T>(config: ProxyConfiguration): AsyncGenerator<T[]> {
        this.currentEndpoint = config.endpoint;
        console.log('Paginating endpoint:', config.endpoint);

        if (config.endpoint === '/users/me/recordings') {
            const mockRecordings = [
                {
                    id: 'rec1',
                    deleted_time: '',
                    download_url: 'https://zoom.us/rec1/download',
                    file_path: '/2024-03-25/rec1.mp4',
                    file_size: 1024000,
                    file_type: 'MP4',
                    file_extension: 'MP4',
                    meeting_id: 'meet1',
                    play_url: 'https://zoom.us/rec1/play',
                    recording_end: '2024-03-25T11:00:00Z',
                    recording_start: '2024-03-25T10:00:00Z',
                    recording_type: 'shared_screen_with_speaker_view',
                    status: 'completed'
                },
                {
                    id: 'rec2',
                    deleted_time: '',
                    download_url: 'https://zoom.us/rec2/download',
                    file_path: '/2024-03-25/rec2.m4a',
                    file_size: 512000,
                    file_type: 'M4A',
                    file_extension: 'M4A',
                    meeting_id: 'meet1',
                    play_url: 'https://zoom.us/rec2/play',
                    recording_end: '2024-03-25T11:00:00Z',
                    recording_start: '2024-03-25T10:00:00Z',
                    recording_type: 'audio_only',
                    status: 'completed'
                }
            ];

            const mockMeetings = [
                {
                    recording_files: mockRecordings,
                    auto_delete: true,
                    auto_delete_date: '2024-04-25T00:00:00Z',
                    recording_play_passcode: 'pass123'
                }
            ];

            yield mockMeetings as unknown as T[];
        } else {
            yield [] as unknown as T[];
        }
    }

    async batchSave(records: any[], modelName: string) {
        if (modelName === 'RecordingFile') {
            console.log('Saving recordings:', records);
            this.savedRecordings = records;
            console.log('Current saved recordings:', this.savedRecordings);
        }
    }

    async log(message: string): Promise<void> {
        console.log('Log message:', message);
        this.logMessages.push(message);
    }

    getCurrentEndpoint() {
        return this.currentEndpoint;
    }

    getSavedRecordings() {
        return this.savedRecordings;
    }

    getLogMessages(): string[] {
        return this.logMessages;
    }
}

describe('Zoom Recording Files Pagination Tests', () => {
    let nango: MockNango;

    beforeEach(() => {
        nango = new MockNango();
    });

    it('should handle pagination and map fields correctly', async () => {
        const fetchData = (await import('../syncs/recording-files')).default;
        await fetchData(nango as unknown as NangoSync);

        const savedRecordings = nango.getSavedRecordings();
        expect(savedRecordings).toHaveLength(2);

        // Verify first recording
        expect(savedRecordings[0]).toEqual({
            id: 'rec1',
            deletedTime: '',
            downloadUrl: 'https://zoom.us/rec1/download',
            filePath: '/2024-03-25/rec1.mp4',
            fileSize: 1024000,
            fileType: 'MP4',
            fileExtension: 'MP4',
            meetingId: 'meet1',
            playUrl: 'https://zoom.us/rec1/play',
            recordingEnd: '2024-03-25T11:00:00Z',
            recordingStart: '2024-03-25T10:00:00Z',
            recordingType: 'shared_screen_with_speaker_view',
            status: 'completed',
            autoDelete: true,
            autoDeleteDate: '2024-04-25T00:00:00Z',
            playPasscode: 'pass123'
        });

        // Verify second recording
        expect(savedRecordings[1]).toEqual({
            id: 'rec2',
            deletedTime: '',
            downloadUrl: 'https://zoom.us/rec2/download',
            filePath: '/2024-03-25/rec2.m4a',
            fileSize: 512000,
            fileType: 'M4A',
            fileExtension: 'M4A',
            meetingId: 'meet1',
            playUrl: 'https://zoom.us/rec2/play',
            recordingEnd: '2024-03-25T11:00:00Z',
            recordingStart: '2024-03-25T10:00:00Z',
            recordingType: 'audio_only',
            status: 'completed',
            autoDelete: true,
            autoDeleteDate: '2024-04-25T00:00:00Z',
            playPasscode: 'pass123'
        });
    });

    it('should handle empty responses', async () => {
        nango.paginate = async function* <T>(): AsyncGenerator<T[]> {
            yield [] as unknown as T[];
        };

        const fetchData = (await import('../syncs/recording-files')).default;
        await fetchData(nango as unknown as NangoSync);

        const savedRecordings = nango.getSavedRecordings();
        expect(savedRecordings).toHaveLength(0);
    });

    it('should handle pagination errors', async () => {
        nango.paginate = async function* <T>(): AsyncGenerator<T[]> {
            throw new Error('Pagination failed');
            yield [];
        };

        const fetchData = (await import('../syncs/recording-files')).default;
        await expect(fetchData(nango as unknown as NangoSync)).rejects.toThrow('Pagination failed');
    });

    it('should validate backfill period in metadata', async () => {
        const fetchData = (await import('../syncs/recording-files')).default;

        // Test backfill period > 30 days
        nango = new MockNango(); // Reset mock state
        nango.setMockMetadata({ backfillPeriodDays: 31 });
        await expect(fetchData(nango as unknown as NangoSync)).rejects.toThrow('Backfill period cannot be greater than 30 days');

        // Test backfill period < 1 day
        nango = new MockNango(); // Reset mock state
        nango.setMockMetadata({ backfillPeriodDays: 0 });
        await expect(fetchData(nango as unknown as NangoSync)).rejects.toThrow('Backfill period cannot be less than 1 day');

        // Test valid backfill period
        nango = new MockNango(); // Reset mock state
        nango.setMockMetadata({ backfillPeriodDays: 7 });
        await fetchData(nango as unknown as NangoSync);
        expect(nango.getCurrentEndpoint()).toBe('/users/me/recordings');

        // Test undefined metadata
        nango = new MockNango(); // Reset mock state
        nango.setMockMetadata(undefined);
        await fetchData(nango as unknown as NangoSync);
        expect(nango.getCurrentEndpoint()).toBe('/users/me/recordings');
    });
});
