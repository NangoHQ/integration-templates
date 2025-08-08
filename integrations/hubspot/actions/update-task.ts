import { createAction } from "nango";
import { UpdateTaskInputSchema } from '../schema.js';
import { createUpdateTask, toHubspotTask } from '../mappers/toTask.js';

import type { ProxyConfiguration } from "nango";
import { UpdateTaskInput, CreateUpdateTaskOutput } from "../models.js";

const action = createAction({
    description: "Updates a single company in Hubspot",
    version: "2.0.0",

    endpoint: {
        method: "PATCH",
        path: "/tasks",
        group: "Tasks"
    },

    input: CreateUpdateTaskOutput,
    output: UpdateTaskInput,
    scopes: ["crm.objects.contacts.write", "oauth"],

    exec: async (nango, input): Promise<UpdateTaskInput> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
