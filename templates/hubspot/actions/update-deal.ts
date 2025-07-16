import { createAction } from "nango";
import { UpdateDealInputSchema } from '../schema.js';
import { createUpdateDeal, toHubspotDeal } from '../mappers/toDeal.js';

import type { ProxyConfiguration } from "nango";
import { CreateUpdateDealOutput, UpdateDealInput } from "../models.js";

const action = createAction({
    description: "Updates a single deal in Hubspot",
    version: "1.0.0",

    endpoint: {
        method: "PATCH",
        path: "/deal",
        group: "Deals"
    },

    input: UpdateDealInput,
    output: CreateUpdateDealOutput,
    scopes: ["crm.objects.deals.write", "oauth"],

    exec: async (nango, input): Promise<CreateUpdateDealOutput> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: UpdateDealInputSchema, input });

        const hubSpotDeal = toHubspotDeal(parsedInput.data);
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/deals#update-deals
            endpoint: `crm/v3/objects/deals/${parsedInput.data.id}`,
            data: hubSpotDeal,
            retries: 3
        };

        const response = await nango.patch(config);

        return createUpdateDeal(response.data);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
