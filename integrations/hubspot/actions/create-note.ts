import type { NangoAction, ProxyConfiguration, Note } from '../../models';
import { toNote, toHubspotNote } from '../mappers/toNote.js';

export default async function runAction(nango: NangoAction, input: Note): Promise<Note> {
    const hubSpotNote = toHubspotNote(input);
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/notes
        endpoint: 'crm/v3/objects/notes',
        data: hubSpotNote,
        retries: 10
    };
    const response = await nango.post(config);

    return toNote(response.data);
}
