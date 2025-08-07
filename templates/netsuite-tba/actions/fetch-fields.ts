import { createAction } from "nango";
import { fetchFieldsInputSchema } from '../schema.zod.js';
import type { FetchFieldsNetsuiteResponse } from '../types.js';

import { FetchFieldsOutput, FetchFieldsInput } from "../models.js";

const action = createAction({
    description: "Fetches all fields in Netsuite",
    version: "2.0.0",

    endpoint: {
        method: "GET",
        path: "/fetch-fields",
        group: "Fields"
    },

    input: FetchFieldsInput,
    output: FetchFieldsOutput,

    exec: async (nango, input): Promise<FetchFieldsOutput> => {
        await nango.zodValidateInput({ zodSchema: fetchFieldsInputSchema, input });

        const response = await nango.get<FetchFieldsNetsuiteResponse>({
            endpoint: `/metadata-catalog/${input.name}`,
            headers: {
                accept: 'application/schema+json'
            },
            retries: 3
        });

        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        return {
            id: response.data.$id,
            schema: response.data.$schema,
            ...response.data
        } as FetchFieldsOutput;
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
