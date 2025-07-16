import type { Application } from ../models.js;
import type { GemApplication } from '../types.js';

export function toApplication(response: GemApplication): Application {
    return {
        id: response.id,
        candidate_id: response.candidate_id,
        applied_at: response.applied_at,
        rejected_at: response.rejected_at ?? null,
        last_activity_at: response.last_activity_at,
        source: {
            id: response.source.id,
            public_name: response.source.public_name
        },
        credited_to: response.credited_to,
        rejection_reason: response.rejection_reason
            ? {
                  id: response.rejection_reason.id,
                  name: response.rejection_reason.name,
                  type: {
                      id: response.rejection_reason.type.id,
                      name: response.rejection_reason.type.name
                  }
              }
            : null,
        jobs: response.jobs.map((job) => ({
            id: job.id,
            name: job.name
        })),
        job_post_id: response.job_post_id,
        status: response.status,
        current_stage: {
            id: response.current_stage.id,
            name: response.current_stage.name
        },
        deleted_at: response.deleted_at ?? null
    };
}
