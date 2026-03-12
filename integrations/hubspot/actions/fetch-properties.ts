import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    object_type: z.string().describe('The CRM object type to fetch properties for (e.g., contacts, companies, deals, tickets). Example: "companies"')
});

const PropertyOptionSchema = z.object({
    label: z.string(),
    value: z.string(),
    display_order: z.number().optional(),
    hidden: z.boolean().optional()
});

const PropertySchema = z.object({
    name: z.string().describe('Internal property name'),
    label: z.string().describe('Display name of the property'),
    type: z.string().describe('Data type (string, number, bool, datetime, enumeration, etc.)'),
    field_type: z.string().describe('UI field type (text, select, checkbox, etc.)'),
    description: z.union([z.string(), z.null()]).describe('Property description'),
    group_name: z.union([z.string(), z.null()]).describe('Property group name'),
    read_only: z.boolean().describe('Whether the property is read-only'),
    hidden: z.boolean().describe('Whether the property is hidden'),
    archived: z.boolean().describe('Whether the property is archived'),
    options: z.array(PropertyOptionSchema).optional().describe('Available options for enumeration type properties'),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const OutputSchema = z.object({
    object_type: z.string().describe('The requested object type'),
    properties: z.array(PropertySchema).describe('List of property metadata for the object type')
});

const action = createAction({
    description: 'List CRM property metadata for a specified HubSpot object type',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/fetch-properties',
        group: 'CRM'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['crm.objects.contacts.read', 'crm.objects.companies.read', 'crm.objects.deals.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/crm-properties-v3/guide
        const response = await nango.get({
            endpoint: `/crm/v3/properties/${input.object_type}`,
            retries: 3
        });

        if (!response.data?.results) {
            return {
                object_type: input.object_type,
                properties: []
            };
        }

        const properties = response.data.results.map((prop: any) => ({
            name: prop.name,
            label: prop.label,
            type: prop.type,
            field_type: prop.fieldType,
            description: prop.description ?? null,
            group_name: prop.groupName ?? null,
            read_only: prop.modificationMetadata?.readOnlyValue ?? false,
            hidden: prop.hidden ?? false,
            archived: prop.archived ?? false,
            options:
                prop.options?.map((opt: any) => ({
                    label: opt.label,
                    value: opt.value,
                    display_order: opt.displayOrder,
                    hidden: opt.hidden
                })) ?? [],
            created_at: prop.createdAt ?? null,
            updated_at: prop.updatedAt ?? null
        }));

        return {
            object_type: input.object_type,
            properties
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
