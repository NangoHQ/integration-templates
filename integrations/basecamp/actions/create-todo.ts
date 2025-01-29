import type { BasecampPerson, NangoAction, ProxyConfiguration } from '../../models';
import { findUserIdByEmail } from '../helpers/find-user.js';
import { createTodoSchema } from '../schema.zod.js';
/**
 * Action: createBasecampTodo
 *
 * 1) Parse input (which includes email arrays).
 * 2) Fetch the project's people (GET /projects/{projectId}/people.json).
 * 3) Match each email to a person, build 'assignee_ids' + 'completion_subscriber_ids'.
 * 4) POST /buckets/{projectId}/todolists/{todoListId}/todos.json to create the to-do.
 */
export default async function runAction(nango: NangoAction, input: unknown) {
    // 1) Validate input
    const parsed = createTodoSchema.safeParse(input);
    if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => e.message).join('; ');
        throw new nango.ActionError({ message: `Invalid Basecamp create-todo input: ${msg}` });
    }

    const { projectId, todoListId, content, description, due_on, starts_on, notify, assigneeEmails, completionSubscriberEmails } = parsed.data;

    // 2) Fetch the project’s people by email -> user ID
    const peopleConfig: ProxyConfiguration = {
        // https://github.com/basecamp/bc3-api/blob/master/sections/people.md#get-people-on-a-project
        endpoint: `/projects/${projectId}/people.json`,
        method: 'GET',
        retries: 5
    };
    const peopleResp = await nango.get<BasecampPerson[]>(peopleConfig);
    const projectPeople = Array.isArray(peopleResp.data) ? peopleResp.data : [];

    const assigneeIds: number[] = [];
    const completionSubscriberIds: number[] = [];

    if (assigneeEmails) {
        for (const email of assigneeEmails) {
            const userId = findUserIdByEmail(email, projectPeople);
            if (userId) {
                assigneeIds.push(userId);
            } else {
                throw new nango.ActionError({ message: `No user found with email: ${email}` });
            }
        }
    }

    if (completionSubscriberEmails) {
        for (const email of completionSubscriberEmails) {
            const userId = findUserIdByEmail(email, projectPeople);
            if (userId) {
                completionSubscriberIds.push(userId);
            } else {
                throw new nango.ActionError({ message: `No user found with email: ${email}` });
            }
        }
    }

    const dataBody: Record<string, unknown> = {
        content
    };
    if (description) dataBody['description'] = description;
    if (due_on) dataBody['due_on'] = due_on;
    if (starts_on) dataBody['starts_on'] = starts_on;
    if (typeof notify === 'boolean') dataBody['notify'] = notify;
    if (assigneeIds.length > 0) dataBody['assignee_ids'] = assigneeIds;
    if (completionSubscriberIds.length > 0) dataBody['completion_subscriber_ids'] = completionSubscriberIds;

    const config: ProxyConfiguration = {
        // https://github.com/basecamp/bc3-api/blob/master/sections/todos.md#create-a-to-do
        endpoint: `/buckets/${projectId}/todolists/${todoListId}/todos.json`,
        method: 'POST',
        data: dataBody,
        retries: 5
    };

    const response = await nango.post<any>(config);
    return { todo: response.data };
}
