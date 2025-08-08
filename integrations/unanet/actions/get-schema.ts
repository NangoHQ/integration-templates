import { createAction } from 'nango';
import type { Schema } from '../models.js';
import { Anonymous_unanet_action_getschema_output, Entity } from '../models.js';

const action = createAction({
    description: 'Get the schema of any entity. Useful to know the properties of any object that exists in the system.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/schema'
    },

    input: Entity,
    output: Anonymous_unanet_action_getschema_output,

    exec: async (nango, input): Promise<Anonymous_unanet_action_getschema_output> => {
        if (!input?.name) {
            throw new nango.ActionError({
                message: 'Name is required to look up an entity schema',
                code: 'missing_name'
            });
        }

        const response = await nango.get<Schema[]>({
            endpoint: `/api/${input.name}/schema`,
            retries: 3
        });

        const { data } = response;

        return data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
