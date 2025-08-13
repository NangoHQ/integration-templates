import { createAction } from 'nango';
import type { GemNote } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Note, CreateNoteParams } from '../models.js';

const action = createAction({
    description: 'Create a note for a candidate',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/candidate-notes',
        group: 'Candidates'
    },

    input: CreateNoteParams,
    output: Note,

    exec: async (nango, input): Promise<Note> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
