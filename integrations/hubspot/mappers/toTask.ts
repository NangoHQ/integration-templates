import type { AssociationCompany, AssociationContact, AssociationDeal, CreateUpdateTaskOutput, CreateTaskInput, UpdateTaskInput, Task } from '../models.js';
import type { HubSpotTask, HubSpotTaskNonUndefined, HubSpotTaskNonNull } from '../types.js';

export function toTask(
    task: HubSpotTaskNonUndefined,
    contacts: AssociationContact[] | undefined,
    companies: AssociationCompany[] | undefined,
    deals: AssociationDeal[] | undefined
): Task {
    const mappedCompanies: AssociationCompany[] = (companies || []).map((company) => ({
        id: company.id,
        name: company.name
    }));

    const mappedContacts: AssociationContact[] = (contacts || []).map((contact) => ({
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name
    }));

    const mappedDeals: AssociationDeal[] = (deals || []).map((deal) => ({
        id: deal.id,
        name: deal.name
    }));

    const taskObject: Task = {
        id: task.id,
        task_type: task.properties.hs_task_type,
        title: task.properties.hs_task_subject,
        priority: task.properties.hs_task_priority,
        assigned_to: task.properties.hubspot_owner_id,
        due_date: task.properties.hs_timestamp,
        notes: task.properties.hs_task_body
    };

    if (mappedCompanies.length > 0 || mappedContacts.length > 0 || mappedDeals.length > 0) {
        taskObject.returned_associations = {
            companies: mappedCompanies,
            contacts: mappedContacts,
            deals: mappedDeals
        };
    }

    return taskObject;
}

export function createUpdateTask(task: HubSpotTaskNonNull): CreateUpdateTaskOutput {
    return {
        id: task.id,
        task_type: task.properties.hs_task_type,
        title: task.properties.hs_task_subject,
        priority: task.properties.hs_task_priority,
        assigned_to: task.properties.hubspot_owner_id,
        due_date: task.properties.hs_timestamp,
        notes: task.properties.hs_task_body
    };
}

export function toHubspotTask(task: CreateTaskInput | UpdateTaskInput): Partial<HubSpotTask> {
    const hubSpotTask: Partial<HubSpotTask> = {
        properties: {}
    };

    if (task.title) {
        hubSpotTask.properties!.hs_task_subject = task.title;
    }

    if (task.due_date) {
        hubSpotTask.properties!.hs_timestamp = task.due_date;
    }

    if (task.priority) {
        hubSpotTask.properties!.hs_task_priority = task.priority;
    }

    if (task.assigned_to) {
        hubSpotTask.properties!.hubspot_owner_id = task.assigned_to;
    }

    if (task.notes) {
        hubSpotTask.properties!.hs_task_body = task.notes;
    }

    if (task.associations) {
        hubSpotTask.associations = task.associations.map((association) => ({
            to: {
                id: association.to
            },
            types: association.types.map((type) => ({
                associationCategory: type.association_category,
                associationTypeId: type.association_type_Id
            }))
        }));
    }

    return hubSpotTask;
}
