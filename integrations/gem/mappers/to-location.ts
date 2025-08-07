import type { Location } from '../../models.js';
import type { GemLocation } from '../types.js';

export function toLocation(response: GemLocation): Location {
    return {
        id: response.id,
        name: response.name,
        location: {
            name: response.location.name
        },
        parent_id: response.parent_id,
        child_ids: response.child_ids,
        parent_office_external_id: response.parent_office_external_id,
        child_office_external_ids: response.child_office_external_ids,
        deleted_at: response.deleted_at
    };
}
