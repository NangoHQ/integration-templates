import type { GongCallTranscriptOutput, GongCallTranscriptSyncOutput } from ../models.js;
import type { GongCallTranscript } from '../types.js';

export function toCallTranscriptWithCursor(gongCallTranscripts: GongCallTranscript[], cursor?: string): GongCallTranscriptOutput {
    const allTranscripts = gongCallTranscripts.map((gongCallTranscript) => ({
        call_id: gongCallTranscript.callId,
        transcript: gongCallTranscript.transcript.map((transcript) => ({
            speaker_id: transcript.speakerId,
            topic: transcript.topic ?? null,
            sentences:
                transcript.sentences?.map((sentence) => ({
                    start: sentence.start,
                    end: sentence.end,
                    text: sentence.text
                })) ?? []
        }))
    }));

    return {
        transcript: allTranscripts,
        next_cursor: cursor
    };
}

export function toCallTranscript(gongCallTranscripts: GongCallTranscript[]): GongCallTranscriptSyncOutput[] {
    return gongCallTranscripts.map((gongCallTranscript) => ({
        id: gongCallTranscript.callId,
        transcript: gongCallTranscript.transcript.map((transcript) => ({
            speaker_id: transcript.speakerId,
            topic: transcript.topic ?? null,
            sentences:
                transcript.sentences?.map((sentence) => ({
                    start: sentence.start,
                    end: sentence.end,
                    text: sentence.text
                })) ?? []
        }))
    }));
}
