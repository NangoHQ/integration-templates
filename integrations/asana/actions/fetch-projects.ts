import { createAction } from "nango";
import { Anonymous_asana_action_fetchprojects_output, AsanaProjectInput } from "../models.js";

const action = createAction({
    description: "Fetch the projects with a limit (default 10) given a workspace of a user to allow selection when choosing the tasks to sync.",
    version: "2.0.0",

    endpoint: {
        method: "GET",
        path: "/projects/limit"
    },

    input: AsanaProjectInput,
    output: Anonymous_asana_action_fetchprojects_output,

    exec: async (nango, input): Promise<Anonymous_asana_action_fetchprojects_output> => {
        const limit = input.limit || 10;
        const workspace = input.workspace;
        const response = await nango.get({
            endpoint: '/api/1.0/projects',
            params: {
                limit,
                workspace
            },
            retries: 3
        });

        return response.data.data;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
