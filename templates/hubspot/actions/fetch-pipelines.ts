import { createAction } from "nango";
import { PipelineOutput, OptionalObjectType } from "../models.js";

const action = createAction({
    description: "Fetch all pipelines for an object type. Defaults to deals",
    version: "1.0.0",

    endpoint: {
        method: "GET",
        path: "/pipelines",
        group: "Pipelines"
    },

    input: OptionalObjectType,
    output: PipelineOutput,
    scopes: ["oauth", "crm.objects.deals.read"],

    exec: async (nango, input): Promise<PipelineOutput> => {
        const objectType = input?.objectType || 'deal';

        const response = await nango.get({
            // https://developers.hubspot.com/docs/api/crm/pipelines
            endpoint: `/crm/v3/pipelines/${objectType}`,
            retries: 3
        });

        const { data } = response;

        return {
            pipelines: data.results
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
