import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const EmployeeSchema = z.object({
    id: z.string(),
    employeeId: z.string().optional(),
    emailId: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    department: z.string().optional(),
    designation: z.string().optional(),
    employeeStatus: z.string().optional(),
    dateOfJoining: z.string().optional(),
    reportingTo: z.string().optional(),
    modifiedTime: z.string().optional()
});

const EmployeeFieldsSchema = z
    .object({
        EmployeeID: z.string().optional(),
        EmailID: z.string().optional(),
        FirstName: z.string().optional(),
        LastName: z.string().optional(),
        Department: z.string().optional(),
        Designation: z.string().optional(),
        Employeestatus: z.string().optional(),
        Dateofjoining: z.string().optional(),
        Reporting_To: z.string().optional(),
        ModifiedTime: z.union([z.string(), z.number()]).optional()
    })
    .passthrough();

const CheckpointSchema = z.object({
    modified_after: z.number()
});

function formatEpochMsToDdMmmYyyy(epochMs: number): string {
    const date = new Date(epochMs);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()];
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
}

const sync = createSync({
    description: 'Sync all employees',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/employees'
        }
    ],
    models: {
        Employee: EmployeeSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let validCheckpoint: z.infer<typeof CheckpointSchema> | undefined;
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            validCheckpoint = parsedCheckpoint.data;
        }

        const params: Record<string, string> = {};
        if (validCheckpoint?.modified_after) {
            params['modifiedtime'] = formatEpochMsToDdMmmYyyy(validCheckpoint.modified_after);
        }

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/people/api/overview.html
            endpoint: '/people/api/forms/employee/getRecords',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'sIndex',
                offset_start_value: 1,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 200,
                response_path: 'response.result'
            },
            retries: 3
        };

        let maxModifiedTime = validCheckpoint?.modified_after ?? 0;

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Unexpected page type from paginate');
            }

            const records: z.infer<typeof EmployeeSchema>[] = [];
            for (const item of page) {
                if (typeof item !== 'object' || item === null) {
                    throw new Error('Unexpected result item type');
                }
                const entries = Object.entries(item);
                if (entries.length !== 1) {
                    throw new Error(`Unexpected result item keys count: ${entries.length}`);
                }
                const entry = entries[0];
                if (!entry) {
                    throw new Error('Unexpected empty entry');
                }
                const [recordId, fieldsArray] = entry;
                if (!Array.isArray(fieldsArray) || fieldsArray.length === 0) {
                    throw new Error('Unexpected fields array');
                }
                const fields = fieldsArray[0];
                if (typeof fields !== 'object' || fields === null) {
                    throw new Error('Unexpected fields type');
                }

                const parsedFields = EmployeeFieldsSchema.safeParse(fields);
                if (!parsedFields.success) {
                    throw new Error(`Invalid employee fields: ${parsedFields.error.message}`);
                }

                const f = parsedFields.data;
                records.push({
                    id: recordId,
                    employeeId: f.EmployeeID,
                    emailId: f.EmailID,
                    firstName: f.FirstName,
                    lastName: f.LastName,
                    department: f.Department,
                    designation: f.Designation,
                    employeeStatus: f.Employeestatus,
                    dateOfJoining: f.Dateofjoining,
                    reportingTo: f.Reporting_To,
                    modifiedTime: f.ModifiedTime !== undefined ? String(f.ModifiedTime) : undefined
                });
            }

            if (records.length > 0) {
                await nango.batchSave(records, 'Employee');

                const modifiedTimes = records.map((r) => (r.modifiedTime ? Number(r.modifiedTime) : 0)).filter((v) => v > 0);
                const pageMax = modifiedTimes.length > 0 ? Math.max(...modifiedTimes) : 0;
                if (pageMax > maxModifiedTime) {
                    maxModifiedTime = pageMax;
                    await nango.saveCheckpoint({ modified_after: maxModifiedTime });
                }
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
