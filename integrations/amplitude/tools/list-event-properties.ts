import { z } from 'zod';
import { createTool } from 'nango';
import type { HttpResponse } from 'nango';

const InputSchema = z
    .object({
        eventType: z
            .string()
            .min(1)
            .optional()
            .describe('Event name whose properties to list; omitted to list shared tracking-plan properties, not every override across events.')
    })
    .describe('Scope of the listing: shared tracking-plan properties when eventType is omitted, or one named event type.');

const OutputItemSchema = z.object({
    eventProperty: z.string().describe('Exact property name.'),
    eventType: z.string().nullable().optional().describe('Associated event name, null or absent for shared scope as returned.'),
    description: z.string().nullable().optional().describe('Property documentation; empty and null remain distinct.'),
    dataType: z.string().nullable().optional().describe('Provider validation type; preserved verbatim, including unknown future values.'),
    regex: z.string().nullable().optional().describe('String validation expression or null.'),
    enumValues: z.array(z.string()).nullable().optional().describe('Allowed enum values parsed from the provider list; null means no configured list.'),
    isArray: z.boolean().optional().describe('Whether the property value is an array.'),
    isRequired: z.boolean().optional().describe('Whether missing values are flagged in the taxonomy UI.'),
    isHidden: z.boolean().optional().describe('Whether hidden from chart dropdowns.'),
    classifications: z.array(z.string()).optional().describe('Provider classifications, preserving order and unknown future values.'),
    deleted: z.boolean().optional().describe('Deletion flag if returned; omitted otherwise.')
});

const OutputSchema = z
    .object({
        items: z.array(OutputItemSchema).describe('Property definitions in provider order.')
    })
    .describe('Unpaginated collection of event property definitions for the requested scope.');

const ProviderEventPropertySchema = z.object({
    event_property: z.string(),
    event_type: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    regex: z.string().nullable().optional(),
    enum_values: z
        .union([z.array(z.unknown()), z.string()])
        .nullable()
        .optional(),
    is_array_type: z.boolean().nullable().optional(),
    is_required: z.boolean().nullable().optional(),
    is_hidden: z.boolean().nullable().optional(),
    classifications: z.array(z.string()).nullable().optional(),
    deleted: z.boolean().nullable().optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderEventPropertySchema)
});

const HttpErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown().optional()
    })
});

const ProviderErrorSchema = z.object({
    errors: z.array(z.object({ message: z.string().optional() })).optional()
});

function parseEnumValues(value: string | unknown[] | null | undefined): string[] | null | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (typeof value === 'string') {
        return value === '' ? [] : value.split(',');
    }
    return value.map((entry) => String(entry));
}

/**
 * @tags: [read]
 * @tagReason: Reads tracking-plan event property definitions from Amplitude without modifying any data.
 * @pitfalls: Amplitude never returns deleted event properties in this listing; a property absent here can still exist in a deleted state, fail creation with a conflict, and must be restored instead.
 */
const tool = createTool({
    name: 'list-event-properties',
    description: 'List shared tracking-plan event properties, or all properties associated with one named event type.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Omit eventType to inspect shared properties; supply a name from `list-event-types` to inspect that event's properties. One call returns the provider's unpaginated collection. Use `create-event-property` to plan a new definition.",
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let response: HttpResponse<unknown>;
        // @allowTryCatch: map Amplitude HTTP error statuses to the tool's stable public error codes.
        try {
            // https://amplitude.com/docs/apis/analytics/taxonomy#get-event-properties
            response = await nango.get({
                endpoint: '/api/2/taxonomy/event-property',
                params: {
                    ...(input.eventType !== undefined && { event_type: input.eventType })
                },
                retries: 3
            });
        } catch (error) {
            const httpError = HttpErrorSchema.safeParse(error);
            if (!httpError.success) {
                throw error;
            }
            const { status, data } = httpError.data.response;
            const providerError = ProviderErrorSchema.safeParse(data);
            const detail = providerError.success
                ? (providerError.data.errors ?? [])
                      .map((entry) => entry.message)
                      .filter((message): message is string => message !== undefined)
                      .join(' ')
                : '';
            if (status === 429) {
                throw new Error('rate_limited: Taxonomy cost limits are exceeded. Reduce concurrent queries and retry after the limit recovers.');
            }
            if (status === 401 || status === 403) {
                throw new Error('permission_denied: Taxonomy access or entitlement is denied. Ask the project administrator for Data access.');
            }
            if (status === 404 || (status === 400 && /not found/i.test(detail))) {
                throw new Error('not_found: The specified event scope is unavailable. Check `list-event-types` for a valid name.');
            }
            if (status === 400) {
                throw new Error(
                    `invalid_request: Amplitude rejects the property query. Correct the event name using provider details.${detail ? ` Details: ${detail}` : ''}`
                );
            }
            throw error;
        }

        const parsed = ProviderResponseSchema.parse(response.data);

        const items = parsed.data.map((property) => {
            const enumValues = parseEnumValues(property.enum_values);
            return {
                eventProperty: property.event_property,
                ...(property.event_type !== undefined && { eventType: property.event_type }),
                ...(property.description !== undefined && { description: property.description }),
                ...(property.type !== undefined && { dataType: property.type }),
                ...(property.regex !== undefined && { regex: property.regex }),
                ...(enumValues !== undefined && { enumValues }),
                ...(property.is_array_type != null && { isArray: property.is_array_type }),
                ...(property.is_required != null && { isRequired: property.is_required }),
                ...(property.is_hidden != null && { isHidden: property.is_hidden }),
                ...(property.classifications != null && { classifications: property.classifications }),
                ...(property.deleted != null && { deleted: property.deleted })
            };
        });

        return { items };
    }
});

export default tool;
