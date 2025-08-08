import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { CustomObject } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'Fetch custom objects in Hubspot. Requires Hubspot enterprise',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/custom-objects'
    },

    input: z.void(),
    output: CustomObject,
    scopes: ['oauth', 'crm.schemas.custom.read'],

    exec: async (nango): Promise<CustomObject> => {
        const config: ProxyConfiguration = {
            // https://developers.hubspot.com/docs/api/crm/crm-custom-objects
            endpoint: '/crm-object-schemas/v3/schemas',
            retries: 3
        };

        const response = await nango.get(config);

        return response.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
