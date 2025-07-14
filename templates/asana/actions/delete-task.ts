import { createAction } from "nango";
import { Anonymous_asana_action_deletetask_output, Id, NangoActionError } from "../models.js";

const action = createAction({
    description: "Delete a task.",
    version: "1.0.0",

    endpoint: {
        method: "DELETE",
        path: "/tasks",
        group: "Tasks"
    },

    input: Id,
    output: Anonymous_asana_action_deletetask_output,

    exec: async (nango, input): Promise<Anonymous_asana_action_deletetask_output> => {
        if (!input.id) {
            throw new nango.ActionError<NangoActionError>({
                type: 'validation_error',
                message: 'You must specify a task id (gid) to delete.'
            });
        }
        const response = await nango.delete({
            endpoint: `/api/1.0/tasks/${input.id}`,
            retries: 3
        });

        return response.status === 200;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
