import { createAction } from "nango";
import { getTenantId } from '../helpers/get-tenant-id.js';
import { toItem, toXeroItem, toFailedItem } from '../mappers/to-item.js';

import type { ProxyConfiguration } from "nango";

import {
    ItemActionResponse,
    Anonymous_xero_action_updateitem_input,
    ActionErrorResponse,
} from "../models.js";

const action = createAction({
    description: "Updates one or more items in Xero.",
    version: "1.0.3",

    endpoint: {
        method: "PUT",
        path: "/items",
        group: "Items"
    },

    input: Anonymous_xero_action_updateitem_input,
    output: ItemActionResponse,
    scopes: ["accounting.settings"],

    exec: async (nango, input): Promise<ItemActionResponse> => {
        const tenant_id = await getTenantId(nango);

        // Validate the credit notes:

        // Check for required fields
        const invalidItems = input.filter((x: any) => !x.item_code);
        if (invalidItems.length > 0) {
            throw new nango.ActionError<ActionErrorResponse>({
                message: `Some items are missing required fields.\nInvalid items:\n${JSON.stringify(invalidItems, null, 4)}`
            });
        }

        const config: ProxyConfiguration = {
            // https://developer.xero.com/documentation/api/accounting/items/#post-items
            endpoint: 'api.xro/2.0/Items',
            headers: {
                'xero-tenant-id': tenant_id
            },
            data: {
                Items: input.map(toXeroItem)
            },
            retries: 3
        };

        const res = await nango.post(config);
        const items = res.data.Items;

        const failedItems = items.filter((x: any) => x.ValidationErrors.length > 0);
        if (failedItems.length > 0) {
            await nango.log(
                `Some items could not be updated in Xero due to validation errors. Note that the remaining items (${
                    input.length - failedItems.length
                }) were updated successfully. Affected items:\n${JSON.stringify(failedItems, null, 4)}`,
                { level: 'error' }
            );
        }
        const succeededItems = items.filter((x: any) => x.ValidationErrors.length === 0);

        return {
            succeededItems: succeededItems.map(toItem),
            failedItems: failedItems.map(toFailedItem)
        };
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;
