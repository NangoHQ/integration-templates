import { z } from 'zod';
import { createAction } from 'nango';

const CustomObjectSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    object_type_id: z.union([z.string(), z.null()]),
    fully_qualified_name: z.union([z.string(), z.null()]),
    singular_label: z.union([z.string(), z.null()]),
    plural_label: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    primary_display_property: z.union([z.string(), z.null()]),
    secondary_display_properties: z.array(z.string()).optional(),
    required_properties: z.array(z.string()).optional(),
    searchable_properties: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    custom_objects: z.array(CustomObjectSchema)
});

const action = createAction({
    description: 'Retrieve HubSpot custom object schemas for enterprise accounts',
    version: '1.0.0',

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
            name: schema.name ?? null,
            object_type_id: schema.objectTypeId ?? null,
            fully_qualified_name: schema.fullyQualifiedName ?? null,
            singular_label: schema.labels?.singular ?? null,
            plural_label: schema.labels?.plural ?? null,
            description: schema.description ?? null,
            primary_display_property: schema.primaryDisplayProperty ?? null,
            secondary_display_properties: schema.secondaryDisplayProperties || [],
            required_properties: schema.requiredProperties || [],
            searchable_properties: schema.searchableProperties || []
        }));

        return {
            custom_objects: customObjects
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
