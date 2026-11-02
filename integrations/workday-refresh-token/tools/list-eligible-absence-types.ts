import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().min(1).optional().describe('Opaque continuation scoped to this worker and connection; omit initially.'),
        workerId: z.string().min(1).describe('Opaque worker ID or me for the current user.')
    })
    .describe('Input for listing the absence types a worker is eligible to use.');

const EligibleAbsenceTypeSchema = z.object({
    id: z.string().describe("Opaque eligible absence type ID within this worker's eligibility collection."),
    unit: z.string().optional().describe('Provider quantity unit for the type when supplied; omitted otherwise, never inferred.'),
    category: z.string().optional().describe('Provider category distinguishing kinds of absence, if supplied; omitted otherwise and not inferred.'),
    descriptor: z.string().optional().describe('Display name of the absence type; omitted when unavailable.')
});

const OutputSchema = z
    .object({
        items: z.array(EligibleAbsenceTypeSchema).describe("One page of the worker's eligible absence types."),
        nextCursor: z.string().optional().describe('Opaque continuation for another page; omitted when exhausted.')
    })
    .describe("One page of the worker's eligible absence types with an opaque continuation when more pages exist.");

const TenantConfigSchema = z.object({
    tenant: z.string().min(1)
});

const CursorPayloadSchema = z.object({
    o: z.number().int().min(0),
    w: z.string().min(1),
    t: z.string().min(1)
});

const ProviderReferenceSchema = z
    .object({
        id: z.string().optional().nullable(),
        descriptor: z.string().optional().nullable()
    })
    .optional()
    .nullable();

const ProviderEligibleAbsenceTypeSchema = z.object({
    id: z.string().optional().nullable(),
    descriptor: z.string().optional().nullable(),
    category: ProviderReferenceSchema,
    unitOfTime: ProviderReferenceSchema
});

const ProviderResponseSchema = z.object({
    total: z.number().optional().nullable(),
    data: z.array(ProviderEligibleAbsenceTypeSchema).optional().nullable()
});

const ProviderErrorStatusSchema = z.object({
    status: z.number().optional(),
    response: z.object({ status: z.number().optional() }).optional()
});

function encodeCursor(payload: z.infer<typeof CursorPayloadSchema>): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(raw: string): z.infer<typeof CursorPayloadSchema> | undefined {
    let parsedJson: unknown;
    // @allowTryCatch JSON.parse is the only way to detect a malformed cursor payload; a malformed cursor maps to the public invalid_cursor error.
    try {
        parsedJson = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    } catch {
        return undefined;
    }
    const parsed = CursorPayloadSchema.safeParse(parsedJson);
    return parsed.success ? parsed.data : undefined;
}

/**
 * @tags: [read]
 * @tagReason: Reads one page of a worker's eligible absence types from Workday without changing provider data.
 * @pitfalls: Workday returns time off types, absence tables, and leave types together, so a listed type is not necessarily usable for a time off request. Eligibility does not guarantee approval; Workday revalidates balance and eligibility when a request is submitted. Access requires specific tenant security for absence eligibility, so an access_denied error is a tenant permission gap, not a bad request.
 */
const tool = createTool({
    name: 'list-eligible-absence-types',
    description: 'List the absence types a worker is eligible to use.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use a worker ID from `list-workers` or use me. Use these type IDs when preparing a time off request, after confirming the type is usable for time off. Use `get-eligible-absence-type` for one known type. Pass nextCursor back as cursor for another page.',
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },

    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const connection = await nango.getConnection();
        const configTenant = TenantConfigSchema.safeParse(connection.connection_config ?? {});
        const metadataTenant = TenantConfigSchema.safeParse(connection.metadata ?? {});
        const tenant = configTenant.success ? configTenant.data.tenant : metadataTenant.success ? metadataTenant.data.tenant : undefined;

        if (tenant === undefined) {
            throw new Error('invalid_connection_config: Tenant is missing in connection configuration and connection metadata.');
        }

        let offset = 0;
        if (input.cursor !== undefined) {
            const decoded = decodeCursor(input.cursor);
            if (decoded === undefined || decoded.w !== input.workerId || decoded.t !== tenant) {
                throw new Error(
                    'invalid_cursor: The continuation is invalid or not scoped to this worker and connection. Restart list-eligible-absence-types without cursor.'
                );
            }
            offset = decoded.o;
        }

        let response;
        // @allowTryCatch The Nango proxy throws axios-style errors for non-2xx statuses; Workday 404/403 responses are mapped to the public not_found/access_denied codes.
        try {
            // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html — GET /absenceManagement/v5/workers/{ID}/eligibleAbsenceTypes
            response = await nango.get({
                endpoint: `/absenceManagement/v5/${encodeURIComponent(tenant)}/workers/${encodeURIComponent(input.workerId)}/eligibleAbsenceTypes`,
                params: {
                    ...(offset > 0 && { offset: String(offset) })
                },
                retries: 3
            });
        } catch (error) {
            const parsedError = ProviderErrorStatusSchema.safeParse(error);
            const status = parsedError.success ? (parsedError.data.status ?? parsedError.data.response?.status) : undefined;
            if (status === 404) {
                throw new Error('not_found: The worker is unavailable. Check the worker with get-worker.');
            }
            if (status === 403) {
                throw new Error(
                    "access_denied: The connection cannot view the worker's eligibility. Ask a Workday administrator for absence eligibility access."
                );
            }
            throw error;
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const rawPage = providerResponse.data ?? [];

        const items = rawPage
            .filter((item): item is typeof item & { id: string } => typeof item.id === 'string' && item.id.length > 0)
            .map((item) => ({
                id: item.id,
                ...(typeof item.unitOfTime?.descriptor === 'string' && { unit: item.unitOfTime.descriptor }),
                ...(typeof item.category?.descriptor === 'string' && { category: item.category.descriptor }),
                ...(typeof item.descriptor === 'string' && { descriptor: item.descriptor })
            }));

        // Advance by the raw page length so filtered entries never overlap or truncate later pages.
        const nextOffset = offset + rawPage.length;
        const total = providerResponse.total ?? undefined;
        const exhausted = rawPage.length === 0 || (total !== undefined && nextOffset >= total);

        return {
            items,
            ...(!exhausted && { nextCursor: encodeCursor({ o: nextOffset, w: input.workerId, t: tenant }) })
        };
    }
});

export default tool;
