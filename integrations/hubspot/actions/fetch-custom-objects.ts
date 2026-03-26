import { z } from 'zod';
import { createAction } from 'nango';

const CustomObjectSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    objectTypeId: z.string().optional(),
    fullyQualifiedName: z.string().optional(),
    singularLabel: z.string().optional(),
    pluralLabel: z.string().optional(),
    description: z.string().optional(),
    primaryDisplayProperty: z.string().optional(),
    secondaryDisplayProperties: z.array(z.string()).optional(),
    requiredProperties: z.array(z.string()).optional(),
    searchableProperties: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    customObjects: z.array(CustomObjectSchema)
});

const action = createAction({
    description: 'Retrieve HubSpot custom object schemas for enterprise accounts',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/fetch-custom-objects',
        group: 'CRM'
    },

    input: z.object({}),
    output: OutputSchema,
    scopes: ['crm.schemas.custom.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/crm-schemas-v3/core/get-crm-object-schemas-v3-schemas
        const response = await nango.get({
            endpoint: '/crm/v3/schemas',
            retries: 3
        });

        const results = response.data?.results || [];

        const customObjects = results.map((schema: any) => ({
            id: schema.objectTypeId || schema.fullyQualifiedName || '',
            name: schema.name ?? undefined,
            objectTypeId: schema.objectTypeId ?? undefined,
            fullyQualifiedName: schema.fullyQualifiedName ?? undefined,
            singularLabel: schema.labels?.singular ?? undefined,
            pluralLabel: schema.labels?.plural ?? undefined,
            description: schema.description ?? undefined,
            primaryDisplayProperty: schema.primaryDisplayProperty ?? undefined,
            secondaryDisplayProperties: schema.secondaryDisplayProperties || [],
            requiredProperties: schema.requiredProperties || [],
            searchableProperties: schema.searchableProperties || []
        }));

        return {
            customObjects: customObjects
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
