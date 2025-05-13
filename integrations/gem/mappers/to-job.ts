import type { Job } from '../../models';
import type { GemJob } from '../types';

export function toJob(response: GemJob): Job {
    return {
        id: response.id,
        name: response.name,
        requisition_id: response.requisition_id,
        confidential: response.confidential,
        status: response.status,
        created_at: response.created_at,
        opened_at: response.opened_at,
        closed_at: response.closed_at ?? null,
        deleted_at: response.deleted_at,
        updated_at: response.updated_at,
        is_template: response.is_template,
        departments: response.departments.map((department) => ({
            id: department.id,
            name: department.name,
            parent_id: department.parent_id,
            child_ids: department.child_ids,
            parent_department_external_id: department.parent_department_external_id,
            child_department_external_ids: department.child_department_external_ids,
            deleted_at: department.deleted_at
        })),
        offices: response.offices.map((office) => ({
            id: office.id,
            name: office.name,
            location: {
                name: office.location.name
            },
            parent_id: office.parent_id,
            child_ids: office.child_ids,
            parent_office_external_id: office.parent_office_external_id,
            child_office_external_ids: office.child_office_external_ids,
            deleted_at: office.deleted_at
        })),
        hiring_team: {
            hiring_managers:
                response.hiring_team.hiring_managers?.map((user) => ({
                    id: user.id,
                    name: user.name,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    employee_id: user.employee_id
                })) ?? null,
            recruiters:
                response.hiring_team.recruiters?.map((user) => ({
                    id: user.id,
                    name: user.name,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    employee_id: user.employee_id
                })) ?? null,
            coordinators:
                response.hiring_team.coordinators?.map((user) => ({
                    id: user.id,
                    name: user.name,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    employee_id: user.employee_id
                })) ?? null,
            sourcers:
                response.hiring_team.sourcers?.map((user) => ({
                    id: user.id,
                    name: user.name,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    employee_id: user.employee_id
                })) ?? null
        }
    };
}
