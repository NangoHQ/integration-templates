import type { Note } from '../../models';
import type { HubSpotNote } from '../types';

export function toNote(note: HubSpotNote): Note {
    return {
        id: note.id,
        time_stamp: note.properties.hs_timestamp,
        created_date: note.properties.hs_createdate,
        body: note.properties.hs_note_body,
        attachment_ids: note.properties.hs_attachment_ids,
        owner: note.properties.hubspot_owner_id
    };
}

export function toHubspotNote(note: Note): Partial<HubSpotNote> {
    const hubSpotNote: Partial<HubSpotNote> = {
        properties: {
            hs_timestamp: note.time_stamp
        }
    };

    if (note.body) {
        hubSpotNote.properties!.hs_note_body = note.body;
    }

    if (note.attachment_ids) {
        hubSpotNote.properties!.hs_attachment_ids = note.attachment_ids;
    }

    if (note.owner) {
        hubSpotNote.properties!.hubspot_owner_id = note.owner;
    }

    if (note.associations) {
        hubSpotNote.associations = note.associations.map((association) => ({
            to: {
                id: association.to
            },
            types: association.types.map((type) => ({
                associationCategory: type.association_category,
                associationTypeId: type.association_type_Id
            }))
        }));
    }

    return hubSpotNote;
}
