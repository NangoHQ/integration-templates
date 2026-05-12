import { createSync } from 'nango';
import { z } from 'zod';

/**
 * Provider schema for YouTube caption track response
 * Matches the YouTube Data API v3 captions resource structure
 * https://developers.google.com/youtube/v3/docs/captions
 */
const ProviderCaptionSchema = z.object({
    id: z.string(),
    snippet: z.object({
        videoId: z.string(),
        lastUpdated: z.string(),
        trackKind: z.string().optional(),
        language: z.string().optional(),
        name: z.string().optional(),
        audioTrackType: z.string().optional(),
        isCC: z.boolean().optional(),
        isLarge: z.boolean().optional(),
        isEasyReader: z.boolean().optional(),
        isDraft: z.boolean().optional(),
        isAutoSynced: z.boolean().optional(),
        status: z.string().optional(),
        failureReason: z.string().optional()
    })
});

/**
 * Normalized CaptionTrack model
 */
const CaptionTrackSchema = z.object({
    id: z.string().describe('The ID that YouTube uses to uniquely identify the caption track'),
    video_id: z.string().describe('The ID of the video associated with the caption track'),
    last_updated: z.string().describe('The date and time when the caption track was last updated in ISO 8601 format'),
    track_kind: z.string().optional().describe('The caption track type: ASR, forced, or standard'),
    language: z.string().optional().describe('The language of the caption track as a BCP-47 language tag'),
    name: z.string().optional().describe('The name of the caption track visible to users during playback'),
    audio_track_type: z.string().optional().describe('The type of audio track: commentary, descriptive, primary, or unknown'),
    is_cc: z.boolean().optional().describe('Whether the track contains closed captions for the deaf and hard of hearing'),
    is_large: z.boolean().optional().describe('Whether the caption track uses large text for the vision-impaired'),
    is_easy_reader: z.boolean().optional().describe('Whether the caption track is formatted for easy reader at third-grade level'),
    is_draft: z.boolean().optional().describe('Whether the caption track is a draft and not publicly visible'),
    is_auto_synced: z.boolean().optional().describe('Whether YouTube synchronized the caption track to the audio track'),
    status: z.string().optional().describe('The caption track status: failed, serving, or syncing'),
    failure_reason: z.string().optional().describe('The reason YouTube failed to process the caption track')
});

/**
 * Metadata schema for receiving video IDs from an upstream sync
 */
const MetadataSchema = z.object({
    video_ids: z.array(z.string()).optional().describe('Array of video IDs to fetch caption tracks for')
});

const CheckpointSchema = z.object({
    video_index: z.number().int().nonnegative().describe('Zero-based index of the next video ID to process')
});

const sync = createSync({
    description: 'Sync caption track metadata for YouTube videos in scope',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    endpoints: [
        {
            path: '/syncs/caption-tracks',
            method: 'POST'
        }
    ],
    models: {
        CaptionTrack: CaptionTrackSchema
    },
    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const parsedCheckpoint = rawCheckpoint ? CheckpointSchema.safeParse(rawCheckpoint) : null;
        const checkpoint = parsedCheckpoint?.success ? parsedCheckpoint.data : null;

        // Blocker: The YouTube captions.list endpoint does not support
        // filtering by modification time or returning changed records only.
        // It returns all caption tracks for a given video ID.
        // We checkpoint by video index so interrupted full refreshes can resume.

        let metadata: unknown;
        // @allowTryCatch Metadata is optional and may be absent in local dryruns.
        try {
            metadata = await nango.getMetadata();
        } catch {
            metadata = undefined;
        }
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        const metadataData = parsedMetadata.success ? parsedMetadata.data : {};

        const videoIds = metadataData.video_ids;
        if (!videoIds || videoIds.length === 0) {
            await nango.log('No video_ids found in metadata. Configure video_ids in connection metadata to sync caption tracks.', { level: 'warn' });
            return;
        }

        const startingVideoIndex = checkpoint?.video_index ?? 0;

        await nango.trackDeletesStart('CaptionTrack');
        let syncSuccessful = false;
        let checkpointSaved = false;
        const hadExistingCheckpoint = checkpoint !== null;
        try {
            for (let videoIndex = startingVideoIndex; videoIndex < videoIds.length; videoIndex++) {
                const videoId = videoIds[videoIndex];
                if (!videoId) {
                    continue;
                }

                // https://developers.google.com/youtube/v3/docs/captions/list
                const response = await nango.get({
                    endpoint: '/youtube/v3/captions',
                    params: {
                        part: 'id,snippet',
                        videoId: videoId
                    },
                    retries: 3
                });

                const items = Array.isArray(response.data?.items) ? response.data.items : [];
                const captionTracks: z.infer<typeof CaptionTrackSchema>[] = [];

                for (const item of items) {
                    const parseResult = ProviderCaptionSchema.safeParse(item);
                    if (!parseResult.success) {
                        throw new Error(`Failed to parse caption track: ${parseResult.error.message}`);
                    }

                    const caption = parseResult.data;
                    captionTracks.push({
                        id: caption.id,
                        video_id: caption.snippet.videoId,
                        last_updated: caption.snippet.lastUpdated,
                        track_kind: caption.snippet.trackKind,
                        language: caption.snippet.language,
                        name: caption.snippet.name,
                        audio_track_type: caption.snippet.audioTrackType,
                        is_cc: caption.snippet.isCC,
                        is_large: caption.snippet.isLarge,
                        is_easy_reader: caption.snippet.isEasyReader,
                        is_draft: caption.snippet.isDraft,
                        is_auto_synced: caption.snippet.isAutoSynced,
                        status: caption.snippet.status,
                        failure_reason: caption.snippet.failureReason
                    });
                }

                if (captionTracks.length > 0) {
                    await nango.batchSave(captionTracks, 'CaptionTrack');
                }

                if (videoIndex < videoIds.length - 1) {
                    await nango.saveCheckpoint({ video_index: videoIndex + 1 });
                    checkpointSaved = true;
                }
            }
            syncSuccessful = true;
        } finally {
            if (syncSuccessful && (checkpointSaved || hadExistingCheckpoint)) {
                await nango.clearCheckpoint();
            }
            await nango.trackDeletesEnd('CaptionTrack');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
