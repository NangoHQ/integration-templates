import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const EmployeeSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    preferredName: z.string().optional().nullable(),
    workPhone: z.string().optional(),
    mobilePhone: z.string().optional(),
    department: z.string().optional(),
    location: z.string().optional(),
    division: z.string().optional(),
    supervisor: z.string().optional()
});

// ZodCheckpoint requires non-optional primitive types (string, number, boolean).
// getCheckpoint() returns undefined on the first run; use safeParse to handle that.
const CheckpointSchema = z.object({
    lastSyncDate: z.string()
});

// Fields to request from the BambooHR v2 dataset API.
// Job-information fields use the jobInformation* prefix instead of the v1 short aliases.
// Valid field names are account-specific; discover them via GET /v1.2/datasets/employee/fields.
// Fields like workEmail, jobTitle, linkedIn, instagram, workPhoneExtension may be available
// on accounts that have them configured — add them to this list if needed.
const DATASET_FIELDS = [
    'employeeNumber',
    'firstName',
    'lastName',
    'preferredName',
    'workPhone',
    'mobilePhone',
    'jobInformationDepartment',
    'jobInformationLocation',
    'jobInformationDivision',
    'jobInformationReportsTo',
    'lastChanged'
];

const ProviderRowSchema = z.object({
    fields: z.object({
        employeeNumber: z.union([z.string(), z.number()]).nullable(),
        firstName: z.string().nullish(),
        lastName: z.string().nullish(),
        preferredName: z.string().nullish(),
        workPhone: z.string().nullish(),
        mobilePhone: z.string().nullish(),
        jobInformationDepartment: z.string().nullish(),
        jobInformationLocation: z.string().nullish(),
        jobInformationDivision: z.string().nullish(),
        jobInformationReportsTo: z.string().nullish(),
        lastChanged: z.string().nullish()
    })
});

type ProviderRow = z.infer<typeof ProviderRowSchema>;

const sync = createSync({
    description: 'Sync employees from BambooHR using the v2 datasets API with incremental updates via lastChanged.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [{ method: 'GET', path: '/syncs/employees' }],
    models: {
        Employee: EmployeeSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const subdomain = connection.connection_config?.['subdomain'];
        if (typeof subdomain !== 'string' || subdomain.length === 0) {
            throw new Error('BambooHR subdomain is missing from the connection config.');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParsed = CheckpointSchema.safeParse(rawCheckpoint);
        const lastSyncDate = checkpointParsed.success ? checkpointParsed.data['lastSyncDate'] : undefined;

        let maxLastChanged: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://documentation.bamboohr.com/reference/get-data-from-dataset-v2
            endpoint: '/v2/datasets/employee/data',
            method: 'POST',
            data: {
                fields: DATASET_FIELDS,
                ...(lastSyncDate && { filter: `lastChanged gt '${lastSyncDate}'` })
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pageSize',
                limit: 1000,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const rows of nango.paginate<ProviderRow>(proxyConfig)) {
            const employees = rows
                .map((row) => ProviderRowSchema.parse(row).fields)
                .filter((f) => f.employeeNumber != null)
                .map((f) => {
                    if (f.lastChanged && (!maxLastChanged || f.lastChanged > maxLastChanged)) {
                        maxLastChanged = f.lastChanged;
                    }

                    return {
                        id: String(f.employeeNumber),
                        ...(f.firstName != null && { firstName: f.firstName }),
                        ...(f.lastName != null && { lastName: f.lastName }),
                        ...(f.preferredName != null && { preferredName: f.preferredName }),
                        ...(f.workPhone != null && { workPhone: f.workPhone }),
                        ...(f.mobilePhone != null && { mobilePhone: f.mobilePhone }),
                        ...(f.jobInformationDepartment != null && { department: f.jobInformationDepartment }),
                        ...(f.jobInformationLocation != null && { location: f.jobInformationLocation }),
                        ...(f.jobInformationDivision != null && { division: f.jobInformationDivision }),
                        ...(f.jobInformationReportsTo != null && { supervisor: f.jobInformationReportsTo })
                    };
                });

            if (employees.length > 0) {
                await nango.batchSave(employees, 'Employee');
            }
        }

        if (maxLastChanged) {
            await nango.saveCheckpoint({ lastSyncDate: maxLastChanged });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
