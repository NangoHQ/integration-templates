import type { NangoAction, ProxyConfiguration, CreateUpdateTaskOutput, UpdateTaskInput } from '../../models';
import { UpdateTaskInputSchema } from '../schema.js';
import { createUpdateTask, toHubspotTask } from '../mappers/toTask.js';

export default async function runAction(nango: NangoAction, input: UpdateTaskInput): Promise<CreateUpdateTaskOutput> {
    const parsedInput = UpdateTaskInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to update a task: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to update a contact'
        });
    }

    const hubSpotTask = toHubspotTask(parsedInput.data);
    const config: ProxyConfiguration = {
        endpoint: `crm/v3/objects/tasks/${parsedInput.data.id}`,
        data: hubSpotTask,
        retries: 10
    };

    //https://developers.hubspot.com/docs/api/crm/tasks
    const response = await nango.patch(config);

    return createUpdateTask(response.data);
}
