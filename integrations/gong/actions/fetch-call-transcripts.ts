import type { ActionResponseError, GongCallTranscriptInput, GongCallTranscriptOutput, NangoAction } from '../../models';
import type { GongPaginationParams } from '../helpers/paginate';
import { paginate } from '../helpers/paginate.js';
import { toCallTranscript } from '../mappers/to-call-transcript.js';
import { gongCallTranscriptInputSchema } from '../schema.zod.js';
import type { GongCallTranscriptResponse } from '../types';

export default async function runAction(nango: NangoAction, input: GongCallTranscriptInput): Promise<GongCallTranscriptOutput[]> {
    const parsedInput = gongCallTranscriptInputSchema.safeParse(input);
    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to fetch call transcript: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError<ActionResponseError>({
            message: 'Invalid input provided to fetch call transcript'
        });
    }

    const gongPaginationParams: GongPaginationParams = {
        // https://app.gong.io/settings/api/documentation#post-/v2/calls/transcript
        endpoint: '/v2/calls/transcript',
        filter: {
            callIds: input.call_id,
            fromDateTime: input.from ? new Date(input.from).toISOString() : undefined,
            toDateTime: input.to ? new Date(input.to).toISOString() : undefined
        },
        pagination: {
            response_path: 'callTranscripts'
        }
    };

    const allTranscripts: GongCallTranscriptOutput[] = [];
    for await (const page of paginate<GongCallTranscriptResponse>(nango, gongPaginationParams)) {
        const transcripts: GongCallTranscriptResponse[] = page.callTranscripts;
        const mappedTranscripts = transcripts.map(toCallTranscript);
        allTranscripts.push(...mappedTranscripts);
    }

    return allTranscripts;
}
