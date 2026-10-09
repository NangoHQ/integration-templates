import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        page: z.number().int().positive().optional().describe('Page index to fetch, starting at 1. Defaults to the provider default of 1 when omitted.'),
        limit: z.number().int().positive().optional().describe('Maximum number of templates to return per page.'),
        include_low_priority: z.boolean().optional().describe('Set to true to include low-priority templates (priority >= 10), which are hidden by default.'),
        groups: z.array(z.string()).optional().describe('Only return templates belonging to these group names, e.g. ["activity", "workouts"].')
    })
    .describe('Filters for listing the attribute templates Exist supports.');

const ProviderGroupSchema = z.object({
    name: z.string(),
    label: z.string(),
    priority: z.number()
});

const ProviderTemplateSchema = z.object({
    name: z.string(),
    label: z.string(),
    group: ProviderGroupSchema.nullable(),
    priority: z.number(),
    value_type: z.number(),
    value_type_description: z.string()
});

const ProviderResponseSchema = z.object({
    count: z.number(),
    next: z.string().nullable(),
    previous: z.string().nullable(),
    results: z.array(ProviderTemplateSchema)
});

const TemplateSchema = z.object({
    name: z.string().describe('Stable ASCII identifier for the template, e.g. "steps".'),
    label: z.string().describe('Human-readable label for the template, e.g. "Steps".'),
    group: z
        .object({
            name: z.string().describe('Stable identifier of the group this template belongs to, e.g. "activity".'),
            label: z.string().describe('Human-readable label of the group, e.g. "Activity".'),
            priority: z.number().describe('Sort priority of the group, ascending.')
        })
        .nullable()
        .describe('Group this template belongs to; null for low-priority templates that have no group.'),
    priority: z.number().describe('Sort priority of the template within its group, ascending.'),
    value_type: z.number().describe('Numeric enum for the value type, e.g. 0 = Integer, 1 = Decimal, 3 = Duration (minutes), 7 = Boolean, 8 = Scale (1-9).'),
    value_type_description: z.string().describe('Human-readable description of the value type, e.g. "Integer".')
});

const OutputSchema = z
    .object({
        templates: z.array(TemplateSchema).describe('Attribute templates returned for the requested page.'),
        count: z.number().describe('Total number of templates matching the request.'),
        next: z.string().optional().describe('Absolute URL of the next page of results; omitted when there is no next page.'),
        previous: z.string().optional().describe('Absolute URL of the previous page of results; omitted when there is no previous page.')
    })
    .describe('A page of attribute templates Exist supports, plus paging metadata.');

/**
 * @tags: [read]
 * @tagReason: Reads the catalog of supported attribute templates; no provider state is mutated.
 * @pitfalls: Low-priority templates (priority >= 10) are excluded unless include_low_priority is true; those templates can have a null group, and next/previous are absolute URLs rather than page numbers.
 */
const action = createAction({
    description: "List the attribute templates Exist supports (the catalog of trackable metrics, not the user's own tracked attributes).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number | string[]> = {};
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.limit !== undefined) {
            params['limit'] = input.limit;
        }
        if (input.include_low_priority !== undefined) {
            params['include_low_priority'] = input.include_low_priority ? 'true' : 'false';
        }
        if (input.groups !== undefined && input.groups.length > 0) {
            params['groups'] = input.groups.join(',');
        }

        const response = await nango.get({
            // https://developer.exist.io/reference/attributes/#get-attribute-templates
            endpoint: '/api/2/attributes/templates/',
            params,
            retries: 3
        });

        const provider = ProviderResponseSchema.parse(response.data);

        return {
            templates: provider.results.map((template) => ({
                name: template.name,
                label: template.label,
                group:
                    template.group != null
                        ? {
                              name: template.group.name,
                              label: template.group.label,
                              priority: template.group.priority
                          }
                        : null,
                priority: template.priority,
                value_type: template.value_type,
                value_type_description: template.value_type_description
            })),
            count: provider.count,
            ...(provider.next != null && { next: provider.next }),
            ...(provider.previous != null && { previous: provider.previous })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
