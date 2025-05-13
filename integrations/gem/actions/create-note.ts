import type { NangoAction, ProxyConfiguration } from '../../models';
import type { CreateNoteParams, Note } from '../../models';
import type { GemNote } from '../types';

export default async function runAction(nango: NangoAction, input: CreateNoteParams): Promise<Note> {
    const { candidate_id, ...data } = input;

    const proxyConfig: ProxyConfiguration = {
        // https://api.gem.com/ats/v0/reference#tag/Candidate/paths/~1ats~1v0~1candidates~1%7Bcandidate_id%7D~1activity_feed~1notes/post
        endpoint: `/ats/v0/candidates/${candidate_id}/activity_feed/notes`,
        data,
        retries: 3
    };

    const { data: responseData } = await nango.post<GemNote>(proxyConfig);
    return responseData;
}
