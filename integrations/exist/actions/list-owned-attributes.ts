import { z } from 'zod';
import { createAction } from 'nango';

const AttributeGroupSchema = z.object({
    name: z.string().describe('Machine-readable group name. Example: "activity"'),
    label: z.string().describe('Human-readable group label. Example: "Activity"'),
    priority: z.number().describe('Display priority of the group, where lower numbers are shown first.')
});

const AttributeServiceSchema = z.object({
    name: z.string().describe('Machine-readable service name. Example: "oura"'),
    label: z.string().describe('Human-readable service label. Example: "Oura"')
});

const OwnedAttributeSchema = z.object({
    template: z.string().nullable().describe('Name of the template this attribute was created from, or null for custom attributes. Example: "steps"'),
    name: z.string().describe('Machine-readable attribute name. Example: "steps"'),
    label: z.string().describe('Human-readable attribute label. Example: "Steps"'),
    subgroup: z.string().nullable().describe('Machine-readable subgroup name, or null when the attribute has no subgroup.'),
    group: AttributeGroupSchema.describe('Group this attribute belongs to.'),
    service: AttributeServiceSchema.describe('Service that currently owns this attribute.'),
    active: z.boolean().describe('Whether the attribute is currently active.'),
    priority: z.number().describe('Display priority of the attribute, where lower numbers are shown first.'),
    manual: z.boolean().describe('Whether the attribute is updated manually instead of by a connected service.'),
    value_type: z
        .number()
        .describe(
            'Numeric code for the attribute value type: 0 Integer, 1 Float, 2 String, 3 Period (min), 4 Time of day (min from midnight), 5 Percentage, 6 Time of day (min from midday), 7 Boolean, 8 Integer scale (1-9).'
        ),
    value_type_description: z.string().describe('Human-readable description of the value type. Example: "Integer"'),
    available_services: z.array(AttributeServiceSchema).describe('Services the user has connected that can provide data for this attribute.')
});

const InputSchema = z
    .object({
        page: z.number().int().positive().optional().describe('Page index to fetch, starting at 1. Omit to fetch the first page.'),
        limit: z.number().int().positive().optional().describe('Maximum number of attributes to return per page.'),
        groups: z.array(z.string()).optional().describe('Filter to these attribute groups. Example: ["activity", "workouts"]'),
        attributes: z.array(z.string()).optional().describe('Filter to these attribute names. Example: ["steps", "mood"]'),
        exclude_custom: z.boolean().optional().describe('When true, only templated attributes are returned and custom attributes are excluded.'),
        manual: z
            .boolean()
            .optional()
            .describe('When true, only manually updated attributes are returned; when false, manually updated attributes are excluded.'),
        include_inactive: z.boolean().optional().describe('When true, include inactive attributes (active = false) that are hidden by default.'),
        include_low_priority: z.boolean().optional().describe('When true, include low-priority attributes (priority >= 10).')
    })
    .describe('Filters and pagination for listing the attributes this connection currently owns.');

const ProviderResponseSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(OwnedAttributeSchema)
});

const OutputSchema = z
    .object({
        count: z.number().describe('Total number of owned attributes matching the filters.'),
        next: z.string().nullable().describe('URL of the next page of results, or null if this is the last page.'),
        previous: z.string().nullable().describe('URL of the previous page of results, or null if this is the first page.'),
        results: z.array(OwnedAttributeSchema).describe('Owned attributes returned for this page.')
    })
    .describe('A page of attributes owned by this connection, matching the provider paginated envelope.');

/**
 * @tags: [read]
 * @tagReason: Reads the attributes the connection currently owns without mutating any provider data.
 * @pitfalls: Only attributes this connection currently owns are returned, so an attribute it has released is omitted even when include_inactive is true; include_inactive only surfaces owned attributes that are inactive.
 */
const action = createAction({
    description: "List only the attributes this connection's service currently owns (i.e. can write values for).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.exist.io/reference/attribute_ownership/#list-owned-attributes
        const response = await nango.get({
            endpoint: '/api/2/attributes/owned/',
            params: {
                ...(input.page !== undefined && { page: input.page }),
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.groups !== undefined && { groups: input.groups.join(',') }),
                ...(input.attributes !== undefined && { attributes: input.attributes.join(',') }),
                ...(input.exclude_custom !== undefined && { exclude_custom: input.exclude_custom ? 'true' : 'false' }),
                ...(input.manual !== undefined && { manual: input.manual ? 'true' : 'false' }),
                ...(input.include_inactive !== undefined && { include_inactive: input.include_inactive ? 'true' : 'false' }),
                ...(input.include_low_priority !== undefined && { include_low_priority: input.include_low_priority ? 'true' : 'false' })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            count: parsed.count,
            next: parsed.next,
            previous: parsed.previous,
            results: parsed.results
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
