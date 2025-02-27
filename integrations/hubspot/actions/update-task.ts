import type { NangoAction, ProxyConfiguration, CreateUpdateTaskOutput, UpdateTaskInput } from '../../models';
import { UpdateTaskInputSchema } from '../schema.js';
import { createUpdateTask, toHubspotTask } from '../mappers/toTask.js';

export default async function runAction(nango: NangoAction, input: UpdateTaskInput): Promise<CreateUpdateTaskOutput> {
    nango.zodValidate({ zodSchema: UpdateTaskInputSchema, input });

    const response = await nango.patch(config);

    return createUpdateTask(response.data);
}
