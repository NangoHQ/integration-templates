import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        companyId: z.string().min(1).describe('Company UUID whose departments are requested.')
    })
    .describe('Input for listing all departments of one company.');

const OutputSchema = z
    .object({
        items: z
            .array(
                z.object({
                    id: z.string().optional().describe('Department UUID.'),
                    title: z.string().optional().describe('Department display name.'),
                    companyId: z.string().optional().describe('Owning company UUID.'),
                    employeeIds: z.array(z.string()).optional().describe('UUIDs of assigned employees.'),
                    contractorIds: z.array(z.string()).optional().describe('UUIDs of assigned contractors.')
                })
            )
            .describe('All returned company departments.')
    })
    .describe('Departments of the requested company with their membership.');

const DepartmentMemberSchema = z.object({
    uuid: z.string()
});

const ProviderDepartmentSchema = z.object({
    uuid: z.string().optional(),
    title: z.string().optional(),
    company_uuid: z.string().optional(),
    employees: z.array(DepartmentMemberSchema).optional(),
    contractors: z.array(DepartmentMemberSchema).optional()
});

const ProviderResponseSchema = z.array(ProviderDepartmentSchema);

const ProviderErrorBodySchema = z.object({
    errors: z
        .array(
            z.object({
                category: z.string().optional()
            })
        )
        .optional()
});

const ProxyErrorSchema = z.object({
    response: z
        .object({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

function mapProviderError(error: unknown): Error | undefined {
    const parsed = ProxyErrorSchema.safeParse(error);
    if (!parsed.success) {
        return undefined;
    }

    const status = parsed.data.response?.status;
    const body = ProviderErrorBodySchema.safeParse(parsed.data.response?.data);
    const category = body.success ? body.data.errors?.[0]?.category : undefined;

    // Gusto error categories: https://docs.gusto.com/embedded-payroll/docs/error-categories
    switch (category ?? statusToCategory(status)) {
        case 'not_found':
            return new Error('not_found: Company is unavailable. Check companyId.');
        case 'missing_oauth_scopes':
            return new Error('missing_oauth_scopes: Scope access is denied. Ask for departments read access.');
        case 'missing_permissions':
            return new Error('missing_permissions: Application access is denied. Ask an administrator to obtain Gusto access.');
        case 'rate_limit_exceeded':
            return new Error('rate_limit_exceeded: Rate limit is exceeded. Wait Retry-After and retry.');
        case 'internal_error':
            return new Error('internal_error: Gusto reports an internal error. Retry later.');
        case 'third_party_service_unavailable':
            return new Error('third_party_service_unavailable: Gusto reports an unavailable dependency. Retry later.');
        case 'invalid_application_setup':
            return new Error('invalid_application_setup: Application setup is incomplete. Ask the application administrator to finish setup.');
        default:
            return undefined;
    }
}

function statusToCategory(status: number | undefined): string | undefined {
    switch (status) {
        case 404:
            return 'not_found';
        case 403:
            return 'missing_permissions';
        case 429:
            return 'rate_limit_exceeded';
        case 500:
            return 'internal_error';
        case 502:
        case 503:
            return 'third_party_service_unavailable';
        default:
            return undefined;
    }
}

/**
 * @tags: [read]
 * @tagReason: Reads the company's departments and their membership without mutating any provider data.
 * @pitfalls: This endpoint is part of Gusto Embedded; without the required Gusto agreement the call fails with missing_permissions even when credentials are valid.
 */
const tool = createTool({
    name: 'list-departments',
    description: 'List all departments of a company with their assigned employee and contractor IDs.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use this to discover department IDs and membership. Use `get-department` for a known ID. The provider returns the whole collection in one response; no cursor is required.',
        requiredScopes: ['departments:read'],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let data: unknown;
        // @allowTryCatch Provider HTTP errors are mapped to the tool's documented public error codes.
        try {
            // https://docs.gusto.com/embedded-payroll/reference/get-companies-departments
            const response = await nango.get({
                endpoint: `/v1/companies/${encodeURIComponent(input.companyId)}/departments`,
                headers: {
                    'X-Gusto-API-Version': '2026-06-15'
                },
                retries: 3
            });
            data = response.data;
        } catch (error: unknown) {
            const publicError = mapProviderError(error);
            if (publicError) {
                throw publicError;
            }
            throw error;
        }

        const departments = ProviderResponseSchema.parse(data);

        return {
            items: departments.map((department) => ({
                ...(department.uuid !== undefined && { id: department.uuid }),
                ...(department.title !== undefined && { title: department.title }),
                ...(department.company_uuid !== undefined && { companyId: department.company_uuid }),
                ...(department.employees !== undefined && { employeeIds: department.employees.map((employee) => employee.uuid) }),
                ...(department.contractors !== undefined && { contractorIds: department.contractors.map((contractor) => contractor.uuid) })
            }))
        };
    }
});

export default tool;
