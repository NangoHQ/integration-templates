import { createSync } from 'nango';
import { z } from 'zod';

const DesignationSchema = z.object({
    id: z.string(),
    designation: z.string().optional(),
    zp_designation_code: z.string().optional(),
    mail_alias: z.string().optional(),
    modified_time: z.string().optional()
});

const sync = createSync({
    description: 'Sync all designations (job titles)',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Designation: DesignationSchema
    },
    endpoints: [
        {
            path: '/syncs/designations',
            method: 'GET'
        }
    ],

    exec: async (nango) => {
        // Blocker: the v1 form-based getRecords endpoint does not support incremental
        // filtering (no modified_since, updated_after, or cursor). It returns the
        // full list on every call, so we perform a full refresh with delete tracking.
        await nango.trackDeletesStart('Designation');

        const limit = 200;
        let sIndex = 1;
        let hasMore = true;

        while (hasMore) {
            // https://www.zoho.com/people/api/overview.html
            const response = await nango.get({
                endpoint: '/people/api/forms/designation/getRecords',
                params: {
                    sIndex: String(sIndex),
                    limit: String(limit)
                },
                retries: 3
            });

            const envelopeSchema = z.object({
                response: z.object({
                    result: z.array(z.record(z.string(), z.unknown())).optional(),
                    message: z.string().optional(),
                    status: z.number()
                })
            });

            const envelope = envelopeSchema.safeParse(response.data);
            if (!envelope.success) {
                throw new Error('Invalid response envelope from Zoho People designation API');
            }

            const { response: resp } = envelope.data;
            if (resp.status !== 0) {
                throw new Error(`Zoho People API error: ${resp.message ?? 'Unknown error'}`);
            }

            const result = resp.result ?? [];
            const designations: Array<z.infer<typeof DesignationSchema>> = [];

            for (const record of result) {
                const entries = Object.entries(record);
                if (entries.length === 0) {
                    throw new Error('Unexpected empty designation record');
                }

                const entry = entries[0];
                if (entry === undefined) {
                    throw new Error('Unexpected empty designation record');
                }

                const [recordId, fieldsUnknown] = entry;

                const fieldsArraySchema = z.array(z.record(z.string(), z.unknown()));
                const fieldsArrayResult = fieldsArraySchema.safeParse(fieldsUnknown);
                if (!fieldsArrayResult.success) {
                    throw new Error(`Failed to parse designation fields array for record ${recordId}`);
                }

                const fieldsArray = fieldsArrayResult.data;
                if (fieldsArray.length === 0) {
                    throw new Error(`Empty designation fields array for record ${recordId}`);
                }

                const fields = fieldsArray[0];

                const fieldSchema = z.object({
                    Designation: z.string().optional(),
                    ZP_Designation_Code: z.string().optional(),
                    MailAlias: z.string().optional(),
                    ModifiedTime: z.string().optional()
                });

                const parsedFields = fieldSchema.safeParse(fields);
                if (!parsedFields.success) {
                    throw new Error(`Failed to parse designation fields for record ${recordId}`);
                }

                const f = parsedFields.data;
                designations.push({
                    id: recordId,
                    ...(f.Designation != null && { designation: f.Designation }),
                    ...(f.ZP_Designation_Code != null && { zp_designation_code: f.ZP_Designation_Code }),
                    ...(f.MailAlias != null && { mail_alias: f.MailAlias }),
                    ...(f.ModifiedTime != null && { modified_time: f.ModifiedTime })
                });
            }

            if (designations.length > 0) {
                await nango.batchSave(designations, 'Designation');
            }

            hasMore = result.length === limit;
            sIndex += limit;
        }

        await nango.trackDeletesEnd('Designation');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
