import type { JobPost } from ../models.js;
import type { GemJobPost } from '../types.js';

export function toJobPost(response: GemJobPost): JobPost {
    return {
        id: response.id,
        title: response.title,
        active: response.active,
        live: response.live,
        first_published_at: response.first_published_at,
        job_id: response.job_id,
        content: response.content,
        created_at: response.created_at,
        updated_at: response.updated_at,
        deleted_at: response.deleted_at
    };
}
