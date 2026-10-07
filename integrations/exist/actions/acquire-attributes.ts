import { z } from 'zod';
import { createAction } from 'nango';

const GroupSchema = z.object({
    name: z.string().optional().describe('Group machine name. Example: "activity"'),
    label: z.string().optional().describe('Human-readable group label. Example: "Activity"'),
    priority: z.number().optional().describe('Display priority of the group within the account')
});

const ServiceSchema = z.object({
    name: z.string().optional().describe('Service machine name. Example: "googlefit"'),
    label: z.string().optional().describe('Human-readable service label. Example: "Google Fit"')
});

const AcquireRequestSchema = z.object({
    template: z.string().optional().describe('Attribute template name to acquire, for templated attributes. Example: "steps"'),
    name: z.string().optional().describe('Attribute name to acquire, for custom or already-created attributes. Example: "mood_note"'),
    manual: z.boolean().optional().describe('When true, mark the attribute as manually updated so it is hidden from manual entry in Exist clients')
});

const InputSchema = z
    .object({
        attributes: z
            .array(AcquireRequestSchema)
            .min(1)
            .max(35)
            .describe('Attributes to acquire, one object per attribute (up to 35). Each object must set either template or name.'),
        success_objects: z.boolean().optional().describe('When true, return the full attribute object for each success instead of echoing the request object')
    })
    .describe('Attributes to acquire on this connection and options controlling the response shape.');

const AttributeSchema = z.object({
    template: z.string().nullable().optional().describe('Source template name; null for custom attributes that were not created from a template'),
    name: z.string().optional().describe('Attribute machine name used when writing values'),
    label: z.string().optional().describe('Human-readable attribute label'),
    group: GroupSchema.nullable().optional().describe('Group the attribute belongs to'),
    subgroup: GroupSchema.nullable().optional().describe('Optional subgroup the attribute belongs to, or null when it has none'),
    service: ServiceSchema.nullable().optional().describe('Service currently owning the attribute, or null when unowned'),
    active: z.boolean().optional().describe('Whether the attribute is currently active'),
    priority: z.number().optional().describe('Display priority of the attribute'),
    manual: z.boolean().optional().describe('Whether the attribute is flagged as manually updated'),
    value_type: z.number().optional().describe('Numeric value type code. Example: 0 for Integer, 7 for Boolean'),
    value_type_description: z.string().optional().describe('Human-readable value type. Example: "Integer"'),
    available_services: z.array(ServiceSchema).optional().describe('Services that can provide data for this attribute')
});

const FailedAttributeSchema = z.object({
    template: z.string().nullable().optional().describe('Template name that was requested, when supplied'),
    name: z.string().nullable().optional().describe('Attribute name that was requested, when supplied'),
    manual: z.boolean().optional().describe('Manual flag that was requested, when supplied'),
    error: z.string().optional().describe('Human-readable reason the acquisition failed'),
    error_code: z.string().optional().describe('Machine-readable failure code. Example: "validation"')
});

const OutputSchema = z
    .object({
        success: z.array(AttributeSchema).describe('Attributes that were successfully acquired'),
        failed: z.array(FailedAttributeSchema).describe('Attributes that could not be acquired, with an error and error_code')
    })
    .describe('Result of the acquisition, split into successfully acquired attributes and failures.');

/**
 * @tags: [write]
 * @tagReason: Takes ownership of attributes on the provider so this connection can write their values.
 * @pitfalls: Acquiring is effectively permanent: releasing later only deactivates the attribute and never deletes it or its history, though re-acquiring restores the full value history; acquiring a templated attribute the user does not already have creates it; a 202 status still means some items failed, so inspect the failed array; and unless success_objects is true the success entries echo your request objects instead of returning full attribute objects.
 */
const action = createAction({
    description: 'Take ownership of one or more attributes so this connection can write values for them.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.exist.io/reference/attribute_ownership/
            endpoint: '/api/2/attributes/acquire/',
            params: {
                ...(input.success_objects !== undefined && { success_objects: String(input.success_objects) })
            },
            data: input.attributes,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);

        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
