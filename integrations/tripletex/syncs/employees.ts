import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderEmployeeSchema = z.object({
    id: z.number(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    displayName: z.string().nullish(),
    employeeNumber: z.string().nullish(),
    dateOfBirth: z.string().nullish(),
    email: z.string().nullish(),
    phoneNumberMobile: z.string().nullish(),
    phoneNumberHome: z.string().nullish(),
    phoneNumberWork: z.string().nullish(),
    nationalIdentityNumber: z.string().nullish(),
    dnumber: z.string().nullish(),
    bankAccountNumber: z.string().nullish(),
    iban: z.string().nullish(),
    bic: z.string().nullish(),
    userType: z.string().nullish(),
    isContact: z.boolean().nullish(),
    comments: z.string().nullish(),
    companyId: z.number().nullish()
});

const EmployeeSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    displayName: z.string().optional(),
    employeeNumber: z.string().optional(),
    dateOfBirth: z.string().optional(),
    email: z.string().optional(),
    phoneNumberMobile: z.string().optional(),
    phoneNumberHome: z.string().optional(),
    phoneNumberWork: z.string().optional(),
    nationalIdentityNumber: z.string().optional(),
    dnumber: z.string().optional(),
    bankAccountNumber: z.string().optional(),
    iban: z.string().optional(),
    bic: z.string().optional(),
    userType: z.string().optional(),
    isContact: z.boolean().optional(),
    comments: z.string().optional(),
    companyId: z.number().optional()
});

const sync = createSync({
    description: 'Sync employees.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Employee: EmployeeSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Employee');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/employee',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        const paginator: AsyncIterableIterator<unknown[]> = nango.paginate(proxyConfig);
        for await (const page of paginator) {
            const employees = [];
            for (const record of page) {
                const parsed = ProviderEmployeeSchema.parse(record);
                employees.push({
                    id: String(parsed.id),
                    ...(parsed.firstName != null && { firstName: parsed.firstName }),
                    ...(parsed.lastName != null && { lastName: parsed.lastName }),
                    ...(parsed.displayName != null && { displayName: parsed.displayName }),
                    ...(parsed.employeeNumber != null && { employeeNumber: parsed.employeeNumber }),
                    ...(parsed.dateOfBirth != null && { dateOfBirth: parsed.dateOfBirth }),
                    ...(parsed.email != null && { email: parsed.email }),
                    ...(parsed.phoneNumberMobile != null && { phoneNumberMobile: parsed.phoneNumberMobile }),
                    ...(parsed.phoneNumberHome != null && { phoneNumberHome: parsed.phoneNumberHome }),
                    ...(parsed.phoneNumberWork != null && { phoneNumberWork: parsed.phoneNumberWork }),
                    ...(parsed.nationalIdentityNumber != null && { nationalIdentityNumber: parsed.nationalIdentityNumber }),
                    ...(parsed.dnumber != null && { dnumber: parsed.dnumber }),
                    ...(parsed.bankAccountNumber != null && { bankAccountNumber: parsed.bankAccountNumber }),
                    ...(parsed.iban != null && { iban: parsed.iban }),
                    ...(parsed.bic != null && { bic: parsed.bic }),
                    ...(parsed.userType != null && { userType: parsed.userType }),
                    ...(parsed.isContact != null && { isContact: parsed.isContact }),
                    ...(parsed.comments != null && { comments: parsed.comments }),
                    ...(parsed.companyId != null && { companyId: parsed.companyId })
                });
            }

            if (employees.length > 0) {
                await nango.batchSave(employees, 'Employee');
            }
        }

        await nango.trackDeletesEnd('Employee');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
