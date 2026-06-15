import { createSync, ProxyConfiguration } from 'nango';
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
    exec: async (nango) => {
        // https://www.zoho.com/people/api/overview.html
        const config: ProxyConfiguration = {
            // https://www.zoho.com/people/api/overview.html
            endpoint: '/people/api/forms/department/getRecords',
            params: {
                sIndex: 1,
                limit: 200
            },
            retries: 3,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'sIndex',
                limit_name_in_request: 'limit',
                offset_start_value: 1,
                offset_calculation_method: 'by-response-size',
                response_path: 'response.result',
                limit: 200
            }
        };

        let departments = [];

        await nango.trackDeletesStart('Department');

        const paginator: AsyncGenerator<unknown[], undefined, void> = nango.paginate(config);
        for await (const batch of paginator) {
            for (const item of batch) {
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
                departments = [];
            }
        }

        if (departments.length > 0) {
            await nango.batchSave(departments, 'Department');
        }

        await nango.trackDeletesEnd('Department');
    }
});

export default sync;
