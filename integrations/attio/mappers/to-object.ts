import type { AttioObject } from '../../models.js';
import type { AttioObjectResponse } from '../types.js';

export function toObject(object: AttioObjectResponse): AttioObject {
    return {
        id: object.id.object_id,
        workspace_id: object.id.workspace_id,
        api_slug: object.api_slug,
        singular_noun: object.singular_noun,
        plural_noun: object.plural_noun,
        created_at: object.created_at
    };
}
