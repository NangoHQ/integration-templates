import { createSync } from 'nango';
import { z } from 'zod';

const DepartmentSchema = z.object({
    id: z.string(),
    name: z.string(),
    lead: z.string().optional(),
    parentDepartment: z.string().optional(),
    code: z.string().optional(),
    mailAlias: z.string().optional(),
    addedTime: z.string().optional(),
    modifiedTime: z.string().optional()
});

const RawDepartmentFields = z.record(z.string(), z.unknown());

const RawDepartmentItem = z.record(z.string(), z.array(RawDepartmentFields).min(1));

const ResponseEnvelopeSchema = z.object({
    response: z.object({
        result: z.array(z.unknown()).optional(),
        message: z.string().optional(),
        status: z.number()
    })
});

const CheckpointSchema = z.object({
    sIndex: z.number()
});

const sync = createSync({
    description: 'Sync all departments',
    frequency: 'every hour',
    models: {
        Department: DepartmentSchema
    },
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/departments'
        }
    ],
    checkpoint: CheckpointSchema,
    exec: async (nango) => {
        // https://www.zoho.com/people/api/overview.html
        const checkpoint = await nango.getCheckpoint();
        let validCheckpoint: z.infer<typeof CheckpointSchema> | undefined;
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            validCheckpoint = parsedCheckpoint.data;
        }

        const limit = 200;
        let sIndex = validCheckpoint?.sIndex ?? 1;
        let hasMore = true;

        await nango.trackDeletesStart('Department');

        while (hasMore) {
            // https://www.zoho.com/people/api/overview.html
            const response = await nango.get({
                endpoint: '/people/api/forms/department/getRecords',
                params: {
                    sIndex: String(sIndex),
                    limit: String(limit)
                },
                retries: 3
            });

            const envelope = ResponseEnvelopeSchema.safeParse(response.data);
            if (!envelope.success) {
                throw new Error(`Invalid response envelope from Zoho People department API: ${envelope.error.message}`);
            }

            const { response: resp } = envelope.data;
            if (resp.status !== 0) {
                throw new Error(`Zoho People API error: ${resp.message ?? 'Unknown error'}`);
            }

            const result = resp.result ?? [];
            const departments: Array<z.infer<typeof DepartmentSchema>> = [];

            for (const item of result) {
                const parsed = RawDepartmentItem.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Invalid department item: ${parsed.error.message}`);
                }

                const entries = Object.entries(parsed.data);
                if (entries.length === 0) {
                    throw new Error('Department record has no entries');
                }

                const firstEntry = entries[0];
                if (!firstEntry) {
                    throw new Error('Department record has no entries');
                }

                const [recordId, fieldsArray] = firstEntry;
                const fields = fieldsArray[0];
                if (!fields) {
                    throw new Error(`Department record ${recordId} missing fields array`);
                }

                const name = typeof fields['Department'] === 'string' ? fields['Department'] : '';
                if (!name) {
                    throw new Error(`Department record ${recordId} missing required field Department`);
                }

                const department = {
                    id: recordId,
                    name: name,
                    lead: typeof fields['Department_Lead'] === 'string' ? fields['Department_Lead'] : undefined,
                    parentDepartment: typeof fields['Parent_Department'] === 'string' ? fields['Parent_Department'] : undefined,
                    code: typeof fields['ZP_Department_Code'] === 'string' ? fields['ZP_Department_Code'] : undefined,
                    mailAlias: typeof fields['MailAlias'] === 'string' ? fields['MailAlias'] : undefined,
                    addedTime: typeof fields['AddedTime'] === 'string' ? fields['AddedTime'] : undefined,
                    modifiedTime: typeof fields['ModifiedTime'] === 'string' ? fields['ModifiedTime'] : undefined
                };

                const validated = DepartmentSchema.safeParse(department);
                if (!validated.success) {
                    throw new Error(`Department validation failed for ${recordId}: ${validated.error.message}`);
                }

                departments.push(validated.data);
            }

            if (departments.length > 0) {
                await nango.batchSave(departments, 'Department');
            }

            hasMore = result.length === limit;
            if (hasMore) {
                sIndex += limit;
                await nango.saveCheckpoint({ sIndex });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Department');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
