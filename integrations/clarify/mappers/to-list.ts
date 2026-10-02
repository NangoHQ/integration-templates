import type { ClarifyList } from '../models.js';
import type { ClarifyListResource } from '../types.js';

export function toList(resource: ClarifyListResource): ClarifyList {
    const { attributes } = resource;

    return {
        id: resource.id,
        title: attributes.title,
        entity: attributes.entity,
        emoji: attributes.emoji ?? null,
        description: attributes.description ?? null,
        type: attributes.type,
        state: attributes.state,
        createdAt: attributes._created_at,
        updatedAt: attributes._updated_at
    };
}
