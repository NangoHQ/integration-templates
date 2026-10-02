import type { ClarifyResource } from '../models.js';
import type { ClarifyRecordResource } from '../types.js';

export function toResource(resource: ClarifyRecordResource): ClarifyResource {
    return {
        id: resource.id,
        type: resource.type,
        attributes: resource.attributes
    };
}
