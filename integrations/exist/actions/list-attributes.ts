import { z } from 'zod';
import { createAction } from 'nango';

const ServiceSchema = z.object({
    name: z.string().describe('Service identifier. Example: "googlefit"'),
    label: z.string().describe('Human-readable service name. Example: "Google Fit"')
});

const GroupSchema = z.object({
    name: z.string().describe('Group identifier. Example: "activity"'),
    label: z.string().describe('Human-readable group name. Example: "Activity"'),
    priority: z.number().describe('Sort priority of the group; lower values sort first.')
});

const AttributeSchema = z.object({
    template: z.string().nullable().describe('Name of the template this attribute is based on, or null for custom attributes.'),
    name: z.string().describe('Unique attribute name used when reading or writing its values. Example: "steps"'),
    label: z.string().describe('Human-readable attribute label. Example: "Steps"'),
    subgroup: z.string().nullable().optional().describe('Optional subgroup this attribute belongs to.'),
    group: GroupSchema.describe('Group this attribute belongs to.'),
    service: ServiceSchema.nullable().describe('Service that currently owns this attribute, or null when it is unowned or released.'),
    active: z.boolean().describe('Whether the attribute is active; released attributes are inactive and hidden by default.'),
    priority: z.number().describe('Sort priority of the attribute; lower values sort first.'),
    manual: z.boolean().describe('Whether values for this attribute are entered manually.'),
    value_type: z
        .number()
        .describe(
            'Numeric value type code: 0=Integer, 1=Float, 2=String, 3=Period (min), 4=Time of day (min from midnight), 5=Percentage, 6=Time of day (min from midday), 7=Boolean, 8=Integer scale (1-9).'
        ),
    value_type_description: z.string().describe('Human-readable description of value_type. Example: "Integer"'),
    available_services: z.array(ServiceSchema).describe('Services that could provide data for this attribute.')
});

const InputSchema = z
    .object({
        page: z.number().int().positive().optional().describe('Page index to fetch. Defaults to 1 when omitted.'),
        limit: z.number().int().positive().optional().describe('Maximum number of attributes to return per page.'),
        groups: z.string().optional().describe('Comma-separated list of groups to filter by. Example: "activity,workouts"'),
        attributes: z.string().optional().describe('Comma-separated list of attribute names to filter by. Example: "steps,weight"'),
        exclude_custom: z.boolean().optional().describe('Set to true to only return templated attributes, excluding custom ones.'),
        manual: z.boolean().optional().describe('Set to true to only return manual attributes, or false to exclude them.'),
        include_inactive: z.boolean().optional().describe('Set to true to include inactive (released) attributes, which are hidden by default.'),
        include_low_priority: z.boolean().optional().describe('Set to true to include low-priority attributes (priority >= 10).'),
        owned: z.boolean().optional().describe('Set to true to omit attributes not owned by this client.')
    })
    .describe("Filters for listing the connected user's attributes.");

const OutputSchema = z
    .object({
        count: z.number().describe('Total number of attributes matching the filters across all pages.'),
        next: z.string().nullable().describe('Full URL of the next page of results, or null when this is the last page.'),
        previous: z.string().nullable().describe('Full URL of the previous page of results, or null when this is the first page.'),
        results: z.array(AttributeSchema).describe('Attributes matching the request filters, without their values.')
    })
    .describe("A page of the connected user's attributes without their values.");

const ProviderResponseSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(AttributeSchema)
});

/**
 * @tags: [read]
 * @tagReason: Lists the user's attributes and their metadata without modifying any provider state.
 * @pitfalls: Only active attributes are returned by default, so released attributes (active=false, service=null) are omitted unless include_inactive is set, and results are limited to the connection's granted read scopes.
 */
const action = createAction({
    description: "List the user's attributes (metadata only, no values), including templated and custom attributes owned by any service or none.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.exist.io/reference/attributes/#get-a-users-attributes
        const response = await nango.get({
            endpoint: '/api/2/attributes/',
            params: {
                ...(input.page !== undefined && { page: input.page }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.groups !== undefined && { groups: input.groups }),
                ...(input.attributes !== undefined && { attributes: input.attributes }),
                ...(input.exclude_custom !== undefined && { exclude_custom: input.exclude_custom ? 'true' : 'false' }),
                ...(input.manual !== undefined && { manual: input.manual ? 'true' : 'false' }),
                ...(input.include_inactive !== undefined && { include_inactive: input.include_inactive ? 'true' : 'false' }),
                ...(input.include_low_priority !== undefined && { include_low_priority: input.include_low_priority ? 'true' : 'false' }),
                ...(input.owned !== undefined && { owned: input.owned ? 'true' : 'false' })
            },
            retries: 3
        });

        return ProviderResponseSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
