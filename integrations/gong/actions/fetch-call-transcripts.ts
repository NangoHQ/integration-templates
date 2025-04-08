import type { GongCallTranscriptInput, GongCallTranscriptOutput, NangoAction } from '../../models';
import { toCallTranscriptWithCursor } from '../mappers/to-call-transcript.js';
import { gongCallTranscriptInputSchema } from '../schema.zod.js';
import type { GongCallTranscriptResponse, FilterFields } from '../types';

export default async function runAction(nango: NangoAction, input: GongCallTranscriptInput): Promise<GongCallTranscriptOutput> {
    await nango.zodValidateInput({ zodSchema: gongCallTranscriptInputSchema, input });

    const filter: FilterFields = {
        fromDateTime: input.from ? new Date(input.from).toISOString() : undefined,
        toDateTime: input.to ? new Date(input.to).toISOString() : undefined,
        callIds: input.call_id
    };

    const config = {
        // https://app.gong.io/settings/api/documentation#post-/v2/calls/transcript
        endpoint: '/v2/calls/transcript',
        data: {
            ...(input.cursor && { cursor: input.cursor }),
            filter
        },
        retries: 3,
        method: 'POST'
    };

    const response = await nango.post<GongCallTranscriptResponse>(config);
    return toCallTranscriptWithCursor(response.data.callTranscripts, response.data.records?.cursor);
}
