import type { CreateTaskInput, NangoAction, ProxyConfiguration, CreateUpdateTaskOutput } from '../../models';
import { createUpdateTask, toHubspotTask } from '../mappers/toTask.js';
import { CreateTaskInputSchema } from '../schema.js';

export default async function runAction(nango: NangoAction, input: CreateTaskInput): Promise<CreateUpdateTaskOutput> {
    nango.zodValidateInput({ zodSchema: CreateTaskInputSchema, input });
    const response = await nango.post(config);

    return createUpdateTask(response.data);
}
