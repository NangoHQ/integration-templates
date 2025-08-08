import { createAction } from 'nango';
import { LeverOpportunityNote, LeverCreateNoteInput } from '../models.js';

const action = createAction({
    description: 'Action to create a note and add it to an opportunity.',
    version: '2.0.0',

    endpoint: {
        method: 'POST',
        path: '/notes',
        group: 'Notes'
    },

    input: LeverCreateNoteInput,
    output: LeverOpportunityNote,
    scopes: ['notes:write:admin'],

    exec: async (nango, input): Promise<LeverOpportunityNote> => {
        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunity id is a required field'
            });
        } else if (!input.value) {
            throw new nango.ActionError({
                message: 'value of the note is a required field'
            });
        }

        const endpoint = `/v1/opportunities/${input.opportunityId}/notes`;

        const postData = {
            value: input.value,
            secret: input.secret,
            score: input.score,
            notifyFollowers: input.notifyFollowers,
            createdAt: input.createdAt
        };

        const params = Object.entries({
            ...(input.perform_as ? { perform_as: input.perform_as } : {}),
            ...(input.note_id ? { note_id: input.note_id } : {})
        })
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        const urlWithParams = `${endpoint}${params ? `?${params}` : ''}`;

        const resp = await nango.post({
            endpoint: urlWithParams,
            data: postData,
            retries: 3
        });

        return {
            id: resp.data.data.id,
            text: resp.data.data.text,
            fields: resp.data.data.fields,
            user: resp.data.data.user,
            secret: resp.data.data.secret,
            completedAt: resp.data.data.completedAt,
            createdAt: resp.data.data.createdAt,
            deletedAt: resp.data.data.deletedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
