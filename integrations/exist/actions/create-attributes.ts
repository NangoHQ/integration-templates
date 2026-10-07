import { z } from 'zod';
import { createAction } from 'nango';

const AttributeRequestSchema = z.object({
    template: z
        .string()
        .optional()
        .describe('Name of an attribute template to create and take ownership of, e.g. "steps". Provide this instead of label/group/value_type.'),
    label: z.string().optional().describe('User-facing title for a custom attribute. Required when template is omitted.'),
    group: z
        .string()
        .optional()
        .describe(
            'Group the custom attribute belongs to, e.g. "productivity" or "activity". Required when template is omitted. The "custom" group (Daily tags) only accepts value_type 7 (Boolean).'
        ),
    value_type: z
        .number()
        .int()
        .min(0)
        .max(8)
        .optional()
        .describe(
            'Integer value type for a custom attribute. Required when template is omitted. 0=Integer, 1=Float, 2=String, 3=Period (min), 4=Time of day (min from midnight), 5=Percentage, 6=Time of day (min from midday), 7=Boolean, 8=Integer scale (1-9).'
        ),
    manual: z.boolean().optional().describe('Whether the attribute is manually tracked. Defaults to true.')
});

const InputSchema = z
    .object({
        attributes: z
            .array(AttributeRequestSchema)
            .min(1)
            .max(35)
            .describe(
                'Attributes to create and take ownership of, 1-35 per call. Each item is either a template reference or a full custom attribute definition.'
            )
    })
    .describe('Attributes to create for the connected Exist account.');

const ProviderGroupSchema = z.object({
    name: z.string(),
    label: z.string(),
    priority: z.number().optional()
});

const ProviderServiceSchema = z.object({
    name: z.string(),
    label: z.string()
});

const ProviderAttributeSchema = z.object({
    template: z.string().nullable().optional(),
    name: z.string(),
    label: z.string(),
    group: ProviderGroupSchema,
    service: ProviderServiceSchema.nullable().optional(),
    active: z.boolean(),
    priority: z.number().nullable().optional(),
    manual: z.boolean().nullable().optional(),
    value_type: z.number().nullable().optional(),
    value_type_description: z.string().nullable().optional(),
    available_services: z.array(ProviderServiceSchema).nullable().optional()
});

const ProviderFailedSchema = z.object({
    template: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    group: z.string().nullable().optional(),
    value_type: z.number().nullable().optional(),
    manual: z.boolean().nullable().optional(),
    error_code: z.string().nullable().optional(),
    error: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    success: z.array(ProviderAttributeSchema),
    failed: z.array(ProviderFailedSchema)
});

const GroupSchema = z.object({
    name: z.string().describe('Group machine name, e.g. "activity".'),
    label: z.string().describe('Group display label, e.g. "Activity".'),
    priority: z.number().optional().describe('Display priority of the group.')
});

const ServiceSchema = z.object({
    name: z.string().describe('Service machine name that owns or can supply the attribute.'),
    label: z.string().describe('Service display label.')
});

const CreatedAttributeSchema = z.object({
    template: z.string().optional().describe('Template the attribute was created from. Omitted for fully custom attributes.'),
    name: z.string().describe('Generated attribute name. May differ from the label; use this name for later reads and writes.'),
    label: z.string().describe('User-facing attribute label.'),
    group: GroupSchema.describe('Group the attribute belongs to.'),
    service: ServiceSchema.optional().describe('Service that owns the attribute. Omitted when the attribute has no owning service.'),
    active: z.boolean().describe('Whether the attribute is currently active.'),
    priority: z.number().optional().describe('Display priority of the attribute.'),
    manual: z.boolean().optional().describe('Whether the attribute is manually tracked.'),
    value_type: z.number().optional().describe('Integer value type of the attribute.'),
    value_type_description: z.string().optional().describe('Human-readable value type, e.g. "Integer".'),
    available_services: z.array(ServiceSchema).optional().describe('Services that can supply data for this attribute.')
});

const FailedAttributeSchema = z.object({
    template: z.string().optional().describe('Template requested, when the failure was for a templated attribute.'),
    name: z.string().optional().describe('Attribute name requested, when available.'),
    label: z.string().optional().describe('Custom label requested, when the failure was for a custom attribute.'),
    group: z.string().optional().describe('Custom group requested, when the failure was for a custom attribute.'),
    value_type: z.number().optional().describe('Custom value type requested, when the failure was for a custom attribute.'),
    manual: z.boolean().optional().describe('Manual flag requested, when supplied.'),
    error_code: z.string().optional().describe('Machine-readable failure code, e.g. "validation".'),
    error: z.string().optional().describe('Human-readable failure description.')
});

const OutputSchema = z
    .object({
        success: z.array(CreatedAttributeSchema).describe('Attributes that were created and taken ownership of.'),
        failed: z.array(FailedAttributeSchema).describe('Attributes that could not be created, each with error details.')
    })
    .describe('Result of the create request, split into created and failed attributes.');

/**
 * @tags: [write, destructive]
 * @tagReason: Creates new user attributes and takes ownership of them; creation is a provider mutation with no delete endpoint, so it is effectively permanent and name-reserving.
 * @pitfalls: Creation is permanent (there is no delete endpoint; releasing only deactivates) and re-creating an existing template or label fails with an "exists" error in the failed array. New attributes are auto-seeded with a value for today before any explicit write, and their names are generated from the label so they may differ. The "custom" group only accepts value_type 7 (Boolean), and calls cap at 35 attributes with a 200/202 status, so always inspect the failed array.
 */
const action = createAction({
    description: 'Create new custom attributes (or acquire-by-template in one call) and take ownership of them.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = input.attributes.map((attribute) => {
            if (attribute.template !== undefined) {
                return { template: attribute.template };
            }
            if (attribute.label === undefined || attribute.group === undefined || attribute.value_type === undefined) {
                throw new nango.ActionError({
                    type: 'invalid_attribute',
                    message: 'Each attribute must provide either "template" or all of "label", "group", and "value_type".'
                });
            }
            return {
                label: attribute.label,
                group: attribute.group,
                value_type: attribute.value_type,
                ...(attribute.manual !== undefined && { manual: attribute.manual })
            };
        });

        const response = await nango.post({
            // https://developer.exist.io/reference/creating_attributes/
            endpoint: '/api/2/attributes/create/',
            params: { success_objects: 'true' },
            data: body,
            // Attribute creation is not idempotent: a retry after a lost response could create duplicate or conflicting attributes.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            success: parsed.success.map((attribute) => ({
                ...(attribute.template != null && { template: attribute.template }),
                name: attribute.name,
                label: attribute.label,
                group: {
                    name: attribute.group.name,
                    label: attribute.group.label,
                    ...(attribute.group.priority != null && { priority: attribute.group.priority })
                },
                ...(attribute.service != null && { service: { name: attribute.service.name, label: attribute.service.label } }),
                active: attribute.active,
                ...(attribute.priority != null && { priority: attribute.priority }),
                ...(attribute.manual != null && { manual: attribute.manual }),
                ...(attribute.value_type != null && { value_type: attribute.value_type }),
                ...(attribute.value_type_description != null && { value_type_description: attribute.value_type_description }),
                ...(attribute.available_services != null && {
                    available_services: attribute.available_services.map((service) => ({ name: service.name, label: service.label }))
                })
            })),
            failed: parsed.failed.map((attribute) => ({
                ...(attribute.template != null && { template: attribute.template }),
                ...(attribute.name != null && { name: attribute.name }),
                ...(attribute.label != null && { label: attribute.label }),
                ...(attribute.group != null && { group: attribute.group }),
                ...(attribute.value_type != null && { value_type: attribute.value_type }),
                ...(attribute.manual != null && { manual: attribute.manual }),
                ...(attribute.error_code != null && { error_code: attribute.error_code }),
                ...(attribute.error != null && { error: attribute.error })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
