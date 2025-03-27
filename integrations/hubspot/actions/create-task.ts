import type { CreateTaskInput, NangoAction, ProxyConfiguration, CreateUpdateTaskOutput } from '../../models';
import { createUpdateTask, toHubspotTask } from '../mappers/toTask.js';
import { CreateTaskInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: CreateTaskInput): Promise<CreateUpdateTaskOutput> {
    const parsedInput = await nango.zodValidateInput({ zodSchema: CreateTaskInputSchema, input });

    const hubSpotNote = toHubspotTask(parsedInput.data);
    const config: ProxyConfiguration = {
        // https://developers.hubspot.com/docs/api/crm/tasks
        endpoint: 'crm/v3/objects/tasks',
        data: hubSpotNote,
        retries: 3
    };
    const response = await nango.post(config);

    return createUpdateTask(response.data);
}
