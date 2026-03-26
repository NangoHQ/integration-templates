import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    objectType: z.string().describe('The CRM object type to fetch properties for (e.g., contacts, companies, deals, tickets). Example: "companies"')
});

const PropertyOptionSchema = z.object({
    label: z.string(),
    value: z.string(),
    displayOrder: z.number().optional(),
    hidden: z.boolean().optional()
});

const PropertySchema = z.object({
    name: z.string().describe('Internal property name'),
    label: z.string().describe('Display name of the property'),
    type: z.string().describe('Data type (string, number, bool, datetime, enumeration, etc.)'),
    fieldType: z.string().describe('UI field type (text, select, checkbox, etc.)'),
    description: z.string().optional().describe('Property description'),
    groupName: z.string().optional().describe('Property group name'),
    readOnlyValue: z.boolean().describe('Whether the property is read-only'),
    hidden: z.boolean().describe('Whether the property is hidden'),
    archived: z.boolean().describe('Whether the property is archived'),
    options: z.array(PropertyOptionSchema).optional().describe('Available options for enumeration type properties'),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    objectType: z.string().describe('The requested object type'),
    properties: z.array(PropertySchema).describe('List of property metadata for the object type')
});

const action = createAction({
    description: 'List CRM property metadata for a specified HubSpot object type',
    version: '3.0.0',

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
            endpoint: `/crm/v3/properties/${input.objectType}`,
            retries: 3
        });

        if (!response.data?.results) {
            return {
                objectType: input.objectType,
                properties: []
            };
        }

        const properties = response.data.results.map((prop: any) => ({
            name: prop.name,
            label: prop.label,
            type: prop.type,
            fieldType: prop.fieldType,
            description: prop.description ?? undefined,
            groupName: prop.groupName ?? undefined,
            readOnlyValue: prop.modificationMetadata?.readOnlyValue ?? false,
            hidden: prop.hidden ?? false,
            archived: prop.archived ?? false,
            options:
                prop.options?.map((opt: any) => ({
                    label: opt.label,
                    value: opt.value,
                    displayOrder: opt.displayOrder,
                    hidden: opt.hidden
                })) ?? [],
            createdAt: prop.createdAt ?? undefined,
            updatedAt: prop.updatedAt ?? undefined
        }));

        return {
            objectType: input.objectType,
            properties
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
