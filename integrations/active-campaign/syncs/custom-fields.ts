import { createSync } from 'nango';
import { z } from 'zod';

const ProviderFieldSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    descript: z.string().nullable().optional(),
    type: z.string().optional(),
    isrequired: z.string().optional(),
    perstag: z.string().optional(),
    defval: z.unknown().nullable().optional(),
    show_in_list: z.string().optional(),
    rows: z.string().optional(),
    cols: z.string().optional(),
    visible: z.string().optional(),
    service: z.string().optional(),
    ordernum: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    options: z.array(z.unknown()).optional(),
    relations: z.array(z.unknown()).optional(),
    links: z.record(z.string(), z.string()).optional()
});

const CustomFieldSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    descript: z.string().optional(),
    type: z.string().optional(),
    isrequired: z.string().optional(),
    perstag: z.string().optional(),
    defval: z.unknown().optional(),
    show_in_list: z.string().optional(),
    rows: z.string().optional(),
    cols: z.string().optional(),
    visible: z.string().optional(),
    service: z.string().optional(),
    ordernum: z.string().optional(),
    cdate: z.string().optional(),
    udate: z.string().optional(),
    options: z.array(z.unknown()).optional(),
    relations: z.array(z.unknown()).optional(),
    links: z.record(z.string(), z.string()).optional()
});

const sync = createSync({
    description: 'Sync contact custom fields from ActiveCampaign',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/custom-fields' }],
    models: {
        CustomField: CustomFieldSchema
    },

    exec: async (nango) => {
        // Blocker: GET /3/fields only documents pagination and perstag filtering.
        // The API does not expose an updated-since filter or cursor, so this sync
        // must do a full refresh with deletion tracking.
        await nango.trackDeletesStart('CustomField');

        for await (const page of nango.paginate({
            // https://developers.activecampaign.com/reference/retrieve-fields
            endpoint: '/3/fields',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'fields'
            },
            retries: 3
        })) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginate page to be an array');
            }

            const fields = [];

            for (const raw of page) {
                const parsed = ProviderFieldSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse custom field: ${parsed.error.message}`);
                }
                const data = parsed.data;

                const record: { [key: string]: unknown; id: string } = { id: data.id };
                if (data.title != null) {
                    record['title'] = data.title;
                }
                if (data.descript != null) {
                    record['descript'] = data.descript;
                }
                if (data.type != null) {
                    record['type'] = data.type;
                }
                if (data.isrequired != null) {
                    record['isrequired'] = data.isrequired;
                }
                if (data.perstag != null) {
                    record['perstag'] = data.perstag;
                }
                if (data.defval != null) {
                    record['defval'] = data.defval;
                }
                if (data.show_in_list != null) {
                    record['show_in_list'] = data.show_in_list;
                }
                if (data.rows != null) {
                    record['rows'] = data.rows;
                }
                if (data.cols != null) {
                    record['cols'] = data.cols;
                }
                if (data.visible != null) {
                    record['visible'] = data.visible;
                }
                if (data.service != null) {
                    record['service'] = data.service;
                }
                if (data.ordernum != null) {
                    record['ordernum'] = data.ordernum;
                }
                if (data.cdate != null) {
                    record['cdate'] = data.cdate;
                }
                if (data.udate != null) {
                    record['udate'] = data.udate;
                }
                if (data.options != null) {
                    record['options'] = data.options;
                }
                if (data.relations != null) {
                    record['relations'] = data.relations;
                }
                if (data.links != null) {
                    record['links'] = data.links;
                }

                fields.push(record);
            }

            if (fields.length > 0) {
                await nango.batchSave(fields, 'CustomField');
            }
        }

        await nango.trackDeletesEnd('CustomField');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
