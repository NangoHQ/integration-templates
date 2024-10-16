import type { CreateTaskInput, NangoAction, ProxyConfiguration, CreateUpdateTaskOutput } from '../../models';
import { createUpdateTask, toHubspotTask } from '../mappers/toTask.js';
import { CreateTaskInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: CreateTaskInput): Promise<CreateUpdateTaskOutput> {
    const parsedInput = CreateTaskInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a task: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a task'
        });
    }

    const hubSpotNote = toHubspotTask(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/tasks
        endpoint: 'crm/v3/objects/tasks',
        data: hubSpotNote,
        retries: 10
    };
    const response = await nango.post(config);

    return createUpdateTask(response.data);
}
