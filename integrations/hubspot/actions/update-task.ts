import type { NangoAction, ProxyConfiguration, CreateUpdateTaskOutput, UpdateTaskInput } from '../../models.js';
import { UpdateTaskInputSchema } from '../schema.js';
import { createUpdateTask, toHubspotTask } from '../mappers/toTask.js';

export default async function runAction(nango: NangoAction, input: UpdateTaskInput): Promise<CreateUpdateTaskOutput> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: UpdateTaskInputSchema, input });

    const hubSpotTask = toHubspotTask(parsedInput.data);
    const config: ProxyConfiguration = {
        //https://developers.hubspot.com/docs/api/crm/tasks
        endpoint: `crm/v3/objects/tasks/${parsedInput.data.id}`,
        data: hubSpotTask,
        retries: 3
    };

    const response = await nango.patch(config);

    return createUpdateTask(response.data);
}
