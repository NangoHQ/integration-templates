import type { JobStage } from ../models.js;
import type { GemJobStage } from '../types.js';

export function toJobStage(response: GemJobStage): JobStage {
    return {
        id: response.id,
        name: response.name,
        created_at: response.created_at,
        updated_at: response.updated_at,
        deleted_at: response.deleted_at ?? null,
        active: response.active,
        job_id: response.job_id,
        priority: response.priority,
        interviews: response.interviews.map((interview) => ({
            id: interview.id,
            name: interview.name,
            schedulable: interview.schedulable,
            estimated_minutes: interview.estimated_minutes,
            default_interviewer_users: interview.default_interviewer_users.map((user) => ({
                id: user.id,
                name: user.name,
                first_name: user.first_name,
                last_name: user.last_name,
                employee_id: user.employee_id
            })),
            interview_kit: {
                id: interview.interview_kit.id,
                content: interview.interview_kit.content,
                questions: interview.interview_kit.questions.map((question) => ({
                    id: question.id,
                    name: question.name
                }))
            },
            deleted_at: interview.deleted_at,
            job_stage_interview_item_id: interview.job_stage_interview_item_id
        }))
    };
}
