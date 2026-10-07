import { z } from 'zod';
import { createAction } from 'nango';

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
    priority: z.number().optional(),
    manual: z.boolean().optional(),
    value_type: z.number(),
    value_type_description: z.string().optional()
});

const AttributeListSchema = z.object({
    count: z.number(),
    next: z.string().nullable().optional(),
    previous: z.string().nullable().optional(),
    results: z.array(ProviderAttributeSchema)
});

const FailureSchema = z.object({
    name: z.string().optional(),
    label: z.string().optional(),
    error: z.string().optional(),
    error_code: z.string().optional()
});

const MutationResponseSchema = z.object({
    success: z.array(ProviderAttributeSchema),
    failed: z.array(FailureSchema).optional()
});

const WriteResultSchema = z.object({
    name: z.string(),
    date: z.string().optional(),
    value: z.union([z.number(), z.string(), z.boolean()]).optional(),
    current: z.number().optional()
});

const WriteResponseSchema = z.object({
    success: z.array(WriteResultSchema),
    failed: z.array(FailureSchema).optional()
});

const OutputGroupSchema = z.object({
    name: z.string().describe('Machine name of the attribute group, e.g. "productivity".'),
    label: z.string().describe('Human-readable label of the attribute group.'),
    priority: z.number().optional().describe('Display priority of the group; lower is more prominent.')
});

const OutputServiceSchema = z.object({
    name: z.string().describe('Machine name of the service that owns the attribute.'),
    label: z.string().describe('Human-readable label of the owning service.')
});

const OutputAttributeSchema = z.object({
    template: z.string().nullable().optional().describe('Attribute template this attribute was created from, or null when it is fully custom.'),
    name: z.string().describe('Machine name of the attribute; use this exact name for future writes.'),
    label: z.string().describe('Human-readable label of the attribute.'),
    group: OutputGroupSchema.describe('Group the attribute belongs to.'),
    service: OutputServiceSchema.nullable().optional().describe('Service currently owning the attribute, or null when it is unowned.'),
    active: z.boolean().describe('Whether the attribute is currently active and writable.'),
    priority: z.number().optional().describe('Display priority of the attribute; lower is more prominent.'),
    manual: z.boolean().optional().describe('Whether the attribute is tracked manually.'),
    value_type: z
        .number()
        .describe('Numeric value type (0 integer, 1 float, 2 string, 3 period, 4 time-of-day, 5 percentage, 6 time-of-day, 7 boolean, 8 integer scale).'),
    value_type_description: z.string().optional().describe('Human-readable description of the value type.')
});

const InputSchema = z
    .object({
        name: z.string().describe('Machine name of the metric/attribute to record, e.g. "nango_registry_test".'),
        value: z
            .union([z.number(), z.string(), z.boolean()])
            .describe('Value to record for the date. Must match the attribute value type (integer, float, string, or boolean).'),
        date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional()
            .describe('Date to record the value for, in YYYY-MM-DD format. Defaults to today (UTC).'),
        label: z.string().optional().describe('Human-readable label used only when creating a brand-new attribute; required in that case.'),
        group: z
            .string()
            .optional()
            .describe(
                'Group name used only when creating a brand-new attribute (e.g. "productivity", "activity", "custom"); required in that case. The "custom" group only accepts boolean metrics.'
            ),
        value_type: z
            .number()
            .int()
            .min(0)
            .max(8)
            .optional()
            .describe(
                'Numeric value type used only when creating a brand-new attribute (0 integer, 1 float, 2 string, 3 period, 4 time-of-day, 5 percentage, 6 time-of-day, 7 boolean, 8 integer scale); required in that case.'
            ),
        manual: z.boolean().optional().describe('Whether the attribute is manually tracked. Used when creating or re-acquiring; defaults to true.'),
        accumulate: z
            .boolean()
            .optional()
            .describe('When true, add the value to the existing value for the date instead of overwriting it. Only supported for integer and float metrics.')
    })
    .describe('Input for recording a value against a named metric, creating or re-acquiring the attribute when needed.');

const OutputSchema = z
    .object({
        attribute: OutputAttributeSchema.describe('Final state of the underlying attribute after any creation or re-acquisition.'),
        value_written: z
            .union([z.number(), z.string(), z.boolean()])
            .describe('The value stored for the date after this write; for accumulate writes this is the new running total.')
    })
    .describe('The final attribute state and the value stored for the date.');

/**
 * @tags: [read, write]
 * @tagReason: Reads the attribute's current ownership/active state, then creates, re-acquires, and writes a value to the underlying provider attribute.
 * @pitfalls: Omitting date records against the action's UTC day, which may differ from the user's local tracking day; accumulate only works for integer/float metrics; the 'custom' group only accepts boolean (value_type 7) metrics and may return its label lowercased; a newly created attribute's name is derived from its label (the requested name is ignored and may differ); attribute names are effectively permanent (releasing does not delete history) and re-acquiring an inactive attribute restores its prior values.
 */
const action = createAction({
    description:
        "COMPOSITE: record a value for a named metric today (or a given date), automatically creating or re-acquiring the underlying attribute first if needed - the common 'log this custom thing' use case without the caller having to manage attribute lifecycle state themselves.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const date = input.date ?? new Date().toISOString().slice(0, 10);

        // https://developer.exist.io/reference/attributes/#get-a-users-attributes
        const lookupResponse = await nango.get({
            endpoint: '/api/2/attributes/',
            params: {
                attributes: input.name,
                include_inactive: 'true'
            },
            retries: 3
        });
        const lookup = AttributeListSchema.parse(lookupResponse.data);
        const existing = lookup.results.find((candidate) => candidate.name === input.name);

        let attribute: z.infer<typeof ProviderAttributeSchema>;

        if (!existing) {
            if (input.label === undefined || input.group === undefined || input.value_type === undefined) {
                throw new nango.ActionError({
                    type: 'missing_attribute_definition',
                    message: 'label, group and value_type are required to create a new attribute.'
                });
            }
            if (input.group === 'custom' && input.value_type !== 7) {
                throw new nango.ActionError({
                    type: 'invalid_custom_group_value_type',
                    message: "Only boolean attributes (value_type 7) can live in the 'custom' group; choose another group for non-boolean metrics."
                });
            }

            // https://developer.exist.io/reference/creating_attributes/#create-new-attributes
            const createResponse = await nango.post({
                endpoint: '/api/2/attributes/create/',
                params: { success_objects: 1 },
                data: [
                    {
                        label: input.label,
                        group: input.group,
                        value_type: input.value_type,
                        manual: input.manual ?? true
                    }
                ],
                // Creating an attribute reserves its name permanently, so a retry after an ambiguous response could fail on a name that now exists.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate retries: 0 for this non-idempotent create.
                retries: 0
            });
            attribute = pickMutatedAttribute(nango, createResponse.data);
        } else if (!existing.active || existing.service == null) {
            // https://developer.exist.io/reference/attribute_ownership/#acquire-attributes
            const acquireResponse = await nango.post({
                endpoint: '/api/2/attributes/acquire/',
                params: { success_objects: 1 },
                data: [{ name: existing.name, manual: true }],
                // Acquiring is a state-changing ownership mutation; do not repeat it after an ambiguous response.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate retries: 0 for this non-idempotent acquisition.
                retries: 0
            });
            attribute = pickMutatedAttribute(nango, acquireResponse.data);
        } else {
            attribute = existing;
        }

        const accumulate = input.accumulate === true;

        if (accumulate && attribute.value_type !== 0 && attribute.value_type !== 1) {
            throw new nango.ActionError({
                type: 'unsupported_increment_value_type',
                message: 'accumulate is only supported for integer (0) and float (1) attributes.'
            });
        }

        let writeResult: z.infer<typeof WriteResultSchema>;

        if (accumulate) {
            // https://developer.exist.io/reference/writing_data/#increment-attribute-values
            const incrementResponse = await nango.post({
                endpoint: '/api/2/attributes/increment/',
                data: [{ name: attribute.name, date, value: input.value }],
                // Increment is additive, so a retry after an ambiguous response would double-count the value.
                // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- deliberate retries: 0 for this non-idempotent increment.
                retries: 0
            });
            writeResult = pickWriteResult(nango, incrementResponse.data);
        } else {
            // https://developer.exist.io/reference/writing_data/#update-attribute-values
            const updateResponse = await nango.post({
                endpoint: '/api/2/attributes/update/',
                data: [{ name: attribute.name, date, value: input.value }],
                // Update overwrites the value for the same name and date, so it is safe to retry.
                retries: 3
            });
            writeResult = pickWriteResult(nango, updateResponse.data);
        }

        return {
            attribute: toOutputAttribute(attribute),
            value_written: writeResult.current ?? writeResult.value ?? input.value
        };
    }
});

function toOutputAttribute(attribute: z.infer<typeof ProviderAttributeSchema>): z.infer<typeof OutputAttributeSchema> {
    return {
        name: attribute.name,
        label: attribute.label,
        group: {
            name: attribute.group.name,
            label: attribute.group.label,
            ...(attribute.group.priority !== undefined && { priority: attribute.group.priority })
        },
        active: attribute.active,
        value_type: attribute.value_type,
        ...(attribute.template !== undefined && { template: attribute.template }),
        ...(attribute.service !== undefined && {
            service: attribute.service === null ? null : { name: attribute.service.name, label: attribute.service.label }
        }),
        ...(attribute.priority !== undefined && { priority: attribute.priority }),
        ...(attribute.manual !== undefined && { manual: attribute.manual }),
        ...(attribute.value_type_description !== undefined && { value_type_description: attribute.value_type_description })
    };
}

function pickMutatedAttribute(nango: NangoActionLocal, data: unknown): z.infer<typeof ProviderAttributeSchema> {
    const parsed = MutationResponseSchema.parse(data);
    const created = parsed.success[0];

    if (!created) {
        throw new nango.ActionError({
            type: 'attribute_mutation_failed',
            message: 'Exist did not return a created or acquired attribute.',
            failed: parsed.failed ?? []
        });
    }

    return created;
}

function pickWriteResult(nango: NangoActionLocal, data: unknown): z.infer<typeof WriteResultSchema> {
    const parsed = WriteResponseSchema.parse(data);
    const failed = parsed.failed ?? [];
    const result = parsed.success[0];

    if (!result || failed.length > 0) {
        throw new nango.ActionError({
            type: 'value_write_failed',
            message: 'Exist did not store the value.',
            failed
        });
    }

    return result;
}

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
