import { createAction } from "nango";
import { AlgoliaContact, AlgoliaCreateContactInput } from "../models.js";

const action = createAction({
    description: "Action to add a single record contact to an index",
    version: "1.0.0",

    endpoint: {
        method: "POST",
        path: "/contacts"
    },

    input: AlgoliaCreateContactInput,
    output: AlgoliaContact,

    exec: async (nango, input): Promise<AlgoliaContact> => {
        if (!input.name) {
            throw new nango.ActionError({
                message: 'name is a required field'
            });
        }

        const endpoint = `/1/indexes/contacts`;

        const postData = {
            name: input.name,
            company: input.company,
            email: input.email
        };
        const resp = await nango.post({
            endpoint: endpoint,
            data: postData,
            retries: 3
        });

        return {
            createdAt: resp.data.createdAt,
            taskID: resp.data.taskID,
            objectID: resp.data.objectID
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
