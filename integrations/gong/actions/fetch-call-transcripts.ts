import type { ProxyConfiguration, GongCallTranscriptInput, GongCallTranscriptOutput, NangoAction } from '../../models.js';
import { toCallTranscriptWithCursor } from '../mappers/to-call-transcript.js';
import { gongCallTranscriptInputSchema } from '../schema.zod.js';
import type { GongCallTranscriptResponse, FilterFields, AxiosError, GongError } from '../types.js';

export default async function runAction(nango: NangoAction, input: GongCallTranscriptInput): Promise<GongCallTranscriptOutput> {
    await nango.zodValidateInput({ zodSchema: gongCallTranscriptInputSchema, input });

    const filter: FilterFields = {
        ...(input.from && { fromDateTime: new Date(input.from).toISOString() }),
        ...(input.to && { toDateTime: new Date(input.to).toISOString() }),
        ...(input.workspace_id && { workspaceId: input.workspace_id }),
        ...(input.call_id && { callIds: input.call_id })
    };

    const config: ProxyConfiguration = {
        // https://app.gong.io/settings/api/documentation#post-/v2/calls/transcript
        endpoint: '/v2/calls/transcript',
        data: {
            ...(input.cursor && { cursor: input.cursor }),
            filter
        },
        retries: 3
    };

    // @allowTryCatch
    try {
        const response = await nango.post<GongCallTranscriptResponse>(config);
        return toCallTranscriptWithCursor(response.data.callTranscripts, response.data.records?.cursor);
    } catch (error: any) {
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const errors = (error as AxiosError<GongError>).response?.data?.errors ?? [];
        const emptyResult = errors.includes('No calls found corresponding to the provided filters');

        if (emptyResult) {
            await nango.log('No calls found for the given filters', { level: 'error' });
            return { transcript: [] };
        } else {
            throw error;
        }
    }
}
