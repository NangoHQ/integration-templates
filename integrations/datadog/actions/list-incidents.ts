import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (offset) from the previous response. Omit for the first page.'),
    page_size: z.number().int().min(1).max(100).optional().describe('Size for a given page. The maximum allowed value is 100.')
});

const ProviderNotificationHandleSchema = z
    .object({
        display_name: z.string().nullish(),
        handle: z.string().nullish()
    })
    .passthrough();

const ProviderIncidentAttributesSchema = z
    .object({
        archived: z.string().nullish(),
        case_id: z.number().int().nullish(),
        created: z.string().nullish(),
        customer_impact_duration: z.number().int().nullish(),
        customer_impact_end: z.string().nullish(),
        customer_impact_scope: z.string().nullish(),
        customer_impact_start: z.string().nullish(),
        customer_impacted: z.boolean().nullish(),
        declared: z.string().nullish(),
        detected: z.string().nullish(),
        fields: z.record(z.string(), z.unknown()).nullish(),
        incident_type_uuid: z.string().nullish(),
        is_test: z.boolean().nullish(),
        modified: z.string().nullish(),
        notification_handles: z.array(ProviderNotificationHandleSchema).nullish(),
        public_id: z.number().int().nullish(),
        resolved: z.string().nullish(),
        severity: z.string().nullish(),
        state: z.string().nullish(),
        time_to_detect: z.number().int().nullish(),
        time_to_internal_response: z.number().int().nullish(),
        time_to_repair: z.number().int().nullish(),
        time_to_resolve: z.number().int().nullish(),
        title: z.string(),
        visibility: z.string().nullish()
    })
    .passthrough();

const ProviderIncidentSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        attributes: ProviderIncidentAttributesSchema,
        relationships: z.record(z.string(), z.unknown()).nullish()
    })
    .passthrough();

const ProviderMetaSchema = z
    .object({
        pagination: z
            .object({
                next_offset: z.number().int().nullish(),
                offset: z.number().int().nullish(),
                size: z.number().int().nullish()
            })
            .nullish()
    })
    .nullish();

const ProviderResponseSchema = z.object({
    data: z.array(ProviderIncidentSchema),
    included: z.array(z.record(z.string(), z.unknown())).nullish(),
    meta: ProviderMetaSchema
});

const IncidentSchema = z.object({
    id: z.string(),
    title: z.string(),
    state: z.string().optional(),
    severity: z.string().optional(),
    created_at: z.string().optional(),
    resolved: z.string().optional(),
    customer_impacted: z.boolean().optional(),
    public_id: z.number().int().optional(),
    incident_type_uuid: z.string().optional(),
    archived: z.string().optional(),
    modified: z.string().optional(),
    visibility: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(IncidentSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List incidents tracked via Datadog Incident Management.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incident_read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};
        if (input.cursor !== undefined) {
            params['page[offset]'] = input.cursor;
        }
        if (input.page_size !== undefined) {
            params['page[size]'] = input.page_size;
        }

        const response = await nango.get({
            // https://docs.datadoghq.com/api/latest/incidents/#get-a-list-of-incidents
            endpoint: 'v2/incidents',
            params,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((item) => {
            const attrs = item.attributes;
            return {
                id: item.id,
                title: attrs.title,
                ...(attrs.state != null && { state: attrs.state }),
                ...(attrs.severity != null && { severity: attrs.severity }),
                ...(attrs.created != null && { created_at: attrs.created }),
                ...(attrs.resolved != null && { resolved: attrs.resolved }),
                ...(attrs.customer_impacted != null && { customer_impacted: attrs.customer_impacted }),
                ...(attrs.public_id != null && { public_id: attrs.public_id }),
                ...(attrs.incident_type_uuid != null && { incident_type_uuid: attrs.incident_type_uuid }),
                ...(attrs.archived != null && { archived: attrs.archived }),
                ...(attrs.modified != null && { modified: attrs.modified }),
                ...(attrs.visibility != null && { visibility: attrs.visibility })
            };
        });

        const nextOffset = providerResponse.meta?.pagination?.next_offset;
        return {
            items,
            ...(nextOffset != null && { next_cursor: String(nextOffset) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
