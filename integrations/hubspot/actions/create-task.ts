import { createAction } from "nango";
import { createUpdateTask, toHubspotTask } from '../mappers/toTask.js';
import { CreateTaskInputSchema } from '../schema.js';

import type { ProxyConfiguration } from "nango";
import { CreateUpdateTaskOutput, CreateTaskInput } from "../models.js";

const action = createAction({
    description: "Creates a single task in Hubspot",
    version: "2.0.0",

    endpoint: {
        method: "POST",
        path: "/tasks",
        group: "Tasks"
    },

    input: CreateTaskInput,
    output: CreateUpdateTaskOutput,
    scopes: ["crm.objects.contacts.write", "oauth"],

    exec: async (nango, input): Promise<CreateUpdateTaskOutput> => {
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
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
