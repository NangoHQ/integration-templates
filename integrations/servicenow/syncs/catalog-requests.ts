import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// With sysparm_display_value=true, reference fields resolve to a display value. Depending on the ServiceNow
// version this is either a plain string (display name only, no id) or a { display_value, link } object where
// the sys_id must be recovered from the trailing path segment of `link` (no `value` key is present).
const ReferenceFieldSchema = z
    .union([
        z.string(),
        z
            .object({
                value: z.string().optional(),
                display_value: z.string().optional(),
                link: z.string().optional()
            })
            .passthrough()
    ])
    .optional()
    .nullable();

function extractReferenceName(field: z.infer<typeof ReferenceFieldSchema>): string | undefined {
    if (field == null) {
        return undefined;
    }
    return typeof field === 'string' ? field : field.display_value;
}

function extractReferenceId(field: z.infer<typeof ReferenceFieldSchema>): string | undefined {
    if (field == null || typeof field === 'string') {
        // A plain string is the display value only; it must never be reused as the sys_id.
        return undefined;
    }
    if (field.value) {
        return field.value;
    }
    const match = field.link?.match(/\/([^/]+)$/);
    return match?.[1];
}

const ProviderCatalogRequestSchema = z.object({
    sys_id: z.string(),
    number: z.string().optional(),
    request_state: z.string().optional(),
    stage: z.string().optional(),
    price: z.union([z.string(), z.number()]).optional().nullable(),
    requested_for: ReferenceFieldSchema,
    sys_updated_on: z.string(),
    sys_created_on: z.string().optional(),
    description: z.string().optional().nullable(),
    opened_by: ReferenceFieldSchema,
    approval: z.string().optional().nullable(),
    requested_for_date: z.string().optional().nullable(),
    due_date: z.string().optional().nullable()
});

const CatalogRequestSchema = z.object({
    id: z.string(),
    number: z.string().optional(),
    request_state: z.string().optional(),
    stage: z.string().optional(),
    price: z.string().optional(),
    requested_for: z.string().optional(),
    requested_for_id: z.string().optional(),
    sys_updated_on: z.string(),
    sys_created_on: z.string().optional(),
    description: z.string().optional(),
    opened_by: z.string().optional(),
    opened_by_id: z.string().optional(),
    approval: z.string().optional(),
    requested_for_date: z.string().optional(),
    due_date: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

type CatalogRequest = {
    id: string;
    number?: string;
    request_state?: string;
    stage?: string;
    price?: string;
    requested_for?: string;
    requested_for_id?: string;
    sys_updated_on: string;
    sys_created_on?: string;
    description?: string;
    opened_by?: string;
    opened_by_id?: string;
    approval?: string;
    requested_for_date?: string;
    due_date?: string;
};

const sync = createSync({
    description: 'Sync service catalog requests (sc_request)',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CatalogRequest: CatalogRequestSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint || { updated_after: '' });

        const proxyConfig: ProxyConfiguration = {
            // https://developer.servicenow.com/dev.do#!/reference/api/now/table/table-api
            endpoint: '/api/now/table/sc_request',
            params: {
                sysparm_display_value: 'true',
                sysparm_fields:
                    'sys_id,number,request_state,stage,price,requested_for,sys_updated_on,sys_created_on,description,opened_by,approval,requested_for_date,due_date',
                // Inclusive boundary: records sharing the checkpoint timestamp must be re-included, or they
                // can be permanently skipped after a page/run boundary. batchSave upserts by id, so
                // re-saving the boundary record(s) is safe.
                sysparm_query: checkpoint.updated_after ? `sys_updated_on>=${checkpoint.updated_after}^ORDERBYsys_updated_on` : 'ORDERBYsys_updated_on'
            },
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next',
                limit_name_in_request: 'sysparm_limit',
                limit: 100,
                response_path: 'result'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsed = z.array(ProviderCatalogRequestSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse catalog requests page: ${parsed.error.message}`);
            }

            const records = parsed.data;

            const catalogRequests: CatalogRequest[] = records.map((record) => {
                const requestedForName = extractReferenceName(record.requested_for);
                const requestedForId = extractReferenceId(record.requested_for);
                const openedByName = extractReferenceName(record.opened_by);
                const openedById = extractReferenceId(record.opened_by);

                return {
                    id: record.sys_id,
                    ...(record.number != null && { number: record.number }),
                    ...(record.request_state != null && { request_state: record.request_state }),
                    ...(record.stage != null && { stage: record.stage }),
                    ...(record.price != null && { price: String(record.price) }),
                    ...(requestedForName != null && { requested_for: requestedForName }),
                    ...(requestedForId != null && { requested_for_id: requestedForId }),
                    sys_updated_on: record.sys_updated_on,
                    ...(record.sys_created_on != null && { sys_created_on: record.sys_created_on }),
                    ...(record.description != null && { description: record.description }),
                    ...(openedByName != null && { opened_by: openedByName }),
                    ...(openedById != null && { opened_by_id: openedById }),
                    ...(record.approval != null && { approval: record.approval }),
                    ...(record.requested_for_date != null && { requested_for_date: record.requested_for_date }),
                    ...(record.due_date != null && { due_date: record.due_date })
                };
            });

            if (catalogRequests.length === 0) {
                continue;
            }

            await nango.batchSave(catalogRequests, 'CatalogRequest');
            const lastRecord = catalogRequests[catalogRequests.length - 1];
            if (lastRecord) {
                await nango.saveCheckpoint({
                    updated_after: lastRecord.sys_updated_on
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
