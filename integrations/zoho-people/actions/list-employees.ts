import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum records per page. Default 200.'),
    modifiedTime: z.string().optional().describe('Filter by last modified date (dd-MMM-yyyy).')
});

const EmployeeSchema = z
    .object({
        EmployeeID: z.string().optional(),
        EmailID: z.string().optional(),
        FirstName: z.string().optional(),
        LastName: z.string().optional(),
        Department: z.string().optional(),
        Designation: z.string().optional(),
        Dateofjoining: z.string().optional(),
        modifiedtime: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    response: z.object({
        result: z.unknown().optional(),
        message: z.string().optional(),
        status: z.number().optional()
    })
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            recordId: z.string(),
            employee: EmployeeSchema
        })
    ),
    nextCursor: z.string().optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

const action = createAction({
    description: 'List employees with pagination.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 200;
        const sIndex = input.cursor ? parseInt(input.cursor, 10) : 1;

        // https://www.zoho.com/people/api/forms.html
        const response = await nango.get({
            endpoint: '/people/api/forms/employee/getRecords',
            params: {
                sIndex: String(sIndex),
                limit: String(limit),
                ...(input.modifiedTime && { modifiedtime: input.modifiedTime })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.response.status === 1) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.response.message || 'Zoho People API returned an error',
                status: providerResponse.response.status
            });
        }

        const result = Array.isArray(providerResponse.response.result) ? providerResponse.response.result : [];

        const items = result
            .map((entry: unknown) => {
                if (!isRecord(entry)) {
                    return null;
                }

                const recordEntries = Object.entries(entry);
                const firstEntry = recordEntries[0];
                if (!firstEntry) {
                    return null;
                }

                const [recordId, fieldsArray] = firstEntry;
                if (!Array.isArray(fieldsArray) || fieldsArray.length === 0) {
                    return null;
                }

                const fields = fieldsArray[0];
                const employee = EmployeeSchema.parse(fields);

                return {
                    recordId,
                    employee
                };
            })
            .filter((item): item is { recordId: string; employee: z.infer<typeof EmployeeSchema> } => item !== null);

        const nextCursor = result.length === limit ? String(sIndex + limit) : undefined;

        return {
            items,
            ...(nextCursor && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
