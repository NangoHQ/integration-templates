import type { GongCallTranscriptOutput } from '../../models';
import { gongCallTranscriptOutputSchema } from '../schema.zod.js';
import type { GongCallTranscriptResponse } from '../types';

export function toCallTranscript(gongCallTranscript: GongCallTranscriptResponse): GongCallTranscriptOutput {
    const parsedOutput = gongCallTranscriptOutputSchema.parse({
        call_id: gongCallTranscript.callId,
        transcript: gongCallTranscript.transcript.map((transcript) => ({
            speaker_id: transcript.speakerId,
            topic: transcript.topic,
            sentences: transcript.sentences.map((sentence) => ({
                start: sentence.start,
                end: sentence.end,
                text: sentence.text
            }))
        }))
    });

    return parsedOutput;
}
