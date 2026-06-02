import { createSync } from 'nango';
import { z } from 'zod';

// Raw employee shape returned by the custom report API.
// All fields are strings (BambooHR returns "" for absent values, not null).
const BamboohrEmployeeSchema = z.object({
    id: z.string(),
    employeeNumber: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    address1: z.string(),
    bestEmail: z.string(),
    workEmail: z.string(),
    jobTitle: z.string(),
    hireDate: z.string(),
    terminationDate: z.string(),
    supervisorId: z.string(),
    supervisor: z.string(),
    createdByUserId: z.string(),
    department: z.string(),
    division: z.string(),
    employmentHistoryStatus: z.string(),
    gender: z.string(),
    country: z.string(),
    city: z.string(),
    location: z.string(),
    state: z.string(),
    maritalStatus: z.string(),
    exempt: z.string(),
    payRate: z.string(),
    payType: z.string(),
    payPer: z.string(),
    workPhone: z.string(),
    homePhone: z.string()
});

type BamboohrEmployee = z.infer<typeof BamboohrEmployeeSchema>;

const StandardEmployeeSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string(),
    displayName: z.string(),
    employeeNumber: z.string().optional(),
    title: z.string().optional(),
    department: z.object({
        id: z.string(),
        name: z.string()
    }),
    employmentType: z.union([
        z.literal('FULL_TIME'),
        z.literal('PART_TIME'),
        z.literal('CONTRACTOR'),
        z.literal('INTERN'),
        z.literal('TEMPORARY'),
        z.literal('OTHER')
    ]),
    employmentStatus: z.union([z.literal('ACTIVE'), z.literal('TERMINATED'), z.literal('ON_LEAVE'), z.literal('SUSPENDED'), z.literal('PENDING')]),
    startDate: z.string().optional(),
    terminationDate: z.string().optional(),
    manager: z
        .object({
            id: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string()
        })
        .optional(),
    workLocation: z.object({
        name: z.string(),
        type: z.union([z.literal('OFFICE'), z.literal('REMOTE'), z.literal('HYBRID')]),
        primaryAddress: z
            .object({
                street: z.string().optional(),
                city: z.string().optional(),
                state: z.string().optional(),
                country: z.string().optional(),
                postalCode: z.string().optional(),
                type: z.union([z.literal('WORK'), z.literal('HOME')])
            })
            .optional()
    }),
    addresses: z
        .object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
            postalCode: z.string().optional(),
            type: z.union([z.literal('WORK'), z.literal('HOME')])
        })
        .array(),
    phones: z
        .object({
            type: z.union([z.literal('WORK'), z.literal('HOME'), z.literal('MOBILE')]),
            number: z.string()
        })
        .array(),
    emails: z
        .object({
            type: z.union([z.literal('WORK'), z.literal('PERSONAL')]),
            address: z.string()
        })
        .array(),
    providerSpecific: z.object({}).catchall(z.any())
});

// ZodCheckpoint fields must be non-optional primitives.
const CheckpointSchema = z.object({
    updated_after: z.string()
});

function mapEmploymentType(status: string): z.infer<typeof StandardEmployeeSchema>['employmentType'] {
    switch (status.toUpperCase()) {
        case 'FULL-TIME':
            return 'FULL_TIME';
        case 'PART-TIME':
            return 'PART_TIME';
        case 'INTERN':
            return 'INTERN';
        case 'CONTRACTOR':
            return 'CONTRACTOR';
        default:
            return 'OTHER';
    }
}

function mapEmploymentStatus(status: string): z.infer<typeof StandardEmployeeSchema>['employmentStatus'] {
    switch (status.toUpperCase()) {
        case 'TERMINATED':
            return 'TERMINATED';
        case 'FULL-TIME':
        case 'PART-TIME':
        case 'INTERN':
            return 'ACTIVE';
        default:
            return 'PENDING';
    }
}

function toStandardEmployee(employee: BamboohrEmployee): z.infer<typeof StandardEmployeeSchema> {
    const supervisorParts = employee.supervisor.split(',');
    const supervisorFirstName = supervisorParts[1]?.trim() || '';
    const supervisorLastName = supervisorParts[0]?.trim() || '';

    const phones: z.infer<typeof StandardEmployeeSchema>['phones'] = [];
    if (employee.workPhone) {
        phones.push({ type: 'WORK', number: employee.workPhone });
    }
    if (employee.homePhone) {
        phones.push({ type: 'HOME', number: employee.homePhone });
    }

    return {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.bestEmail,
        displayName: `${employee.firstName} ${employee.lastName}`.trim(),
        employeeNumber: employee.employeeNumber || undefined,
        title: employee.jobTitle || undefined,
        department: {
            id: employee.department || 'unknown',
            name: employee.department || 'Unknown Department'
        },
        employmentType: mapEmploymentType(employee.employmentHistoryStatus),
        employmentStatus: mapEmploymentStatus(employee.employmentHistoryStatus),
        startDate: employee.hireDate || undefined,
        terminationDate: employee.employmentHistoryStatus.toUpperCase() === 'TERMINATED' ? employee.terminationDate || undefined : undefined,
        manager: employee.supervisorId
            ? {
                  id: employee.supervisorId,
                  firstName: supervisorFirstName,
                  lastName: supervisorLastName,
                  email: ''
              }
            : undefined,
        workLocation: {
            name: employee.location,
            type: 'OFFICE',
            primaryAddress: {
                street: employee.address1 || undefined,
                city: employee.city || undefined,
                state: employee.state || undefined,
                country: employee.country || undefined,
                postalCode: undefined,
                type: 'WORK'
            }
        },
        addresses: [
            {
                street: employee.address1 || undefined,
                city: employee.city || undefined,
                state: employee.state || undefined,
                country: employee.country || undefined,
                postalCode: undefined,
                type: 'HOME'
            }
        ],
        phones,
        emails: [{ type: 'WORK', address: employee.bestEmail }],
        providerSpecific: {
            division: employee.division || undefined,
            exempt: employee.exempt || undefined,
            payRate: employee.payRate || undefined,
            payType: employee.payType || undefined,
            payPer: employee.payPer || undefined,
            createdByUserId: employee.createdByUserId || undefined
        }
    };
}

const sync = createSync({
    description: 'Fetches employees from BambooHR and maps them to the standard HRIS employee model.',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,
    endpoints: [
        {
            method: 'GET',
            path: '/employees/unified',
            group: 'Unified HRIS API'
        }
    ],
    models: {
        StandardEmployee: StandardEmployeeSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParsed = CheckpointSchema.safeParse(rawCheckpoint);
        const updatedAfter = checkpointParsed.success ? new Date(checkpointParsed.data['updated_after']) : undefined;
        const runStartedAt = new Date().toISOString();

        // https://documentation.bamboohr.com/reference/request-custom-report-1
        const response = await nango.post({
            endpoint: '/v1/reports/custom',
            params: {
                format: 'JSON',
                onlyCurrent: 'true'
            },
            data: {
                title: 'Current Employees',
                filters: {
                    lastChanged: {
                        includeNull: 'no',
                        ...(updatedAfter && { value: updatedAfter.toISOString().split('.')[0] + 'Z' })
                    }
                },
                fields: [
                    'id',
                    'employeeNumber',
                    'firstName',
                    'lastName',
                    'dateOfBirth',
                    'address1',
                    'bestEmail',
                    'workEmail',
                    'jobTitle',
                    'hireDate',
                    'terminationDate',
                    'supervisorId',
                    'supervisor',
                    'createdByUserId',
                    'department',
                    'division',
                    'employmentHistoryStatus',
                    'gender',
                    'country',
                    'city',
                    'location',
                    'state',
                    'maritalStatus',
                    'exempt',
                    'payRate',
                    'payType',
                    'payPer',
                    'workPhone',
                    'homePhone'
                ]
            },
            retries: 3
        });

        const employees: unknown[] = response.data?.employees ?? [];

        const pageSize = 100;
        for (let i = 0; i < employees.length; i += pageSize) {
            const chunk = employees.slice(i, i + pageSize);
            const mapped = chunk
                .map((raw) => {
                    const parsed = BamboohrEmployeeSchema.safeParse(raw);
                    return parsed.success ? toStandardEmployee(parsed.data) : null;
                })
                .filter((e): e is z.infer<typeof StandardEmployeeSchema> => e !== null);

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'StandardEmployee');
            }
        }

        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
