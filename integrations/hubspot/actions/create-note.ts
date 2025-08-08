import { createAction } from 'nango';
import { toNote, toHubspotNote } from '../mappers/toNote.js';

import type { ProxyConfiguration } from 'nango';
import { Note } from '../models.js';

const action = createAction({
    description: 'Creates a single note in Hubspot',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/note'
    },

    input: Note,
    output: Note,
    scopes: ['crm.objects.contacts.write', 'oauth'],

    exec: async (nango, input): Promise<Note> => {
        const hubSpotNote = toHubspotNote(input);
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/notes
            endpoint: 'crm/v3/objects/notes',
            data: hubSpotNote,
            retries: 3
        };
        const response = await nango.post(config);

        return toNote(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
