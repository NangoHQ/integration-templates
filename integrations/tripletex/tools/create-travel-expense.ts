import { z } from 'zod';
import { createTool } from 'nango';

const TravelDetailsSchema = z
    .object({
        purpose: z.string().optional().describe('Business purpose as ordinary text.'),
        isDayTrip: z.boolean().optional().describe('Whether this is a day trip.'),
        returnDate: z.iso.date().optional().describe('Return calendar date, not earlier than departureDate when both supplied.'),
        destination: z.string().optional().describe('Destination location as ordinary text.'),
        departureDate: z.iso.date().optional().describe('Departure calendar date.'),
        departureFrom: z.string().optional().describe('Departure location as ordinary text.'),
        isForeignTravel: z.boolean().optional().describe('Whether this is foreign travel.'),
        detailedJourneyDescription: z.string().optional().describe('Detailed journey narrative as ordinary text.')
    })
    .describe('Optional structured trip details; omitted components use provider behavior.')
    .refine((details) => Object.values(details).some((value) => value !== undefined), { message: 'travelDetails must contain at least one field.' })
    .meta({ minProperties: 1 });

const InputSchema = z
    .object({
        title: z.string().min(1).describe('Human-readable title of the travel expense report.'),
        projectId: z
            .string()
            .regex(/^[1-9][0-9]*$/)
            .optional()
            .describe('Existing project to associate; omit for provider default/no association.'),
        employeeId: z
            .string()
            .regex(/^[1-9][0-9]*$/)
            .describe('Existing employee ID that owns the report.'),
        departmentId: z
            .string()
            .regex(/^[1-9][0-9]*$/)
            .optional()
            .describe('Existing department to associate; omit for provider default.'),
        isChargeable: z.boolean().optional().describe('Whether the report is chargeable; omission delegates to provider defaults.'),
        travelDetails: TravelDetailsSchema.optional()
    })
    .describe('Fields for creating one travel expense report for an employee.');

const OutputSchema = z
    .object({
        id: z.string().describe('Created travel expense ID.'),
        state: z.string().nullable().optional().describe('Initial lifecycle state actually returned by Tripletex, not assumed OPEN.'),
        title: z.string().nullable().optional().describe('Title returned after creation.'),
        version: z.number().int().optional().describe('Created record revision, when returned.')
    })
    .describe('Created travel expense report as returned by Tripletex.');

const CreateTravelExpenseResponseSchema = z.object({
    value: z.object({
        id: z.number().int(),
        state: z.string().optional(),
        title: z.string().nullable().optional(),
        version: z.number().int().nullable().optional()
    })
});

const ProviderHttpErrorSchema = z.object({
    response: z
        .object({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

const ProviderErrorBodySchema = z.object({
    message: z.string().optional(),
    validationMessages: z
        .array(
            z.object({
                field: z.string().nullable().optional(),
                message: z.string().nullable().optional()
            })
        )
        .nullable()
        .optional()
});

const MAX_SERIALIZABLE_ID = BigInt(Number.MAX_SAFE_INTEGER);

function toProviderId(value: string, fieldName: string): number {
    const parsed = BigInt(value);
    if (parsed > MAX_SERIALIZABLE_ID) {
        throw new Error(`invalid_identifier: ${fieldName} '${value}' exceeds the provider int64 identifier range. Use IDs from current company records.`);
    }
    return Number(parsed);
}

function describeProviderFailure(data: unknown): string {
    const parsed = ProviderErrorBodySchema.safeParse(data);
    if (!parsed.success) {
        return '';
    }
    const messages = (parsed.data.validationMessages ?? [])
        .map((entry) => [entry.field, entry.message].filter((part) => typeof part === 'string' && part.length > 0).join(': '))
        .filter((entry) => entry.length > 0);
    if (messages.length > 0) {
        return ` ${messages.join('; ')}`;
    }
    return typeof parsed.data.message === 'string' && parsed.data.message.length > 0 ? ` ${parsed.data.message}` : '';
}

function referencesMissing(data: unknown): boolean {
    const parsed = ProviderErrorBodySchema.safeParse(data);
    if (!parsed.success) {
        return false;
    }
    return (parsed.data.validationMessages ?? []).some((entry) => typeof entry.field === 'string' && /employee|project|department/i.test(entry.field));
}

/**
 * @tags: [write]
 * @tagReason: Creates a new travel expense report through POST /travelExpense, a provider mutation with no reads.
 * @pitfalls: Tripletex fully validates a travel expense report only when it is completed, so creation can succeed with data that later blocks completion, delivery, or approval. Employee, project, and department IDs must belong to the API token's company or Tripletex reports them as not found. Tripletex marks this endpoint BETA.
 */
const tool = createTool({
    name: 'create-travel-expense',
    description: 'Create a travel expense report for an employee with trip details and optional project/department association.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Have employeeId from the company's employee records, and any project/department IDs before calling. This creates the report, not reimbursement, submission, or approval. Use `update-travel-expense` for an existing report and `get-travel-expense` to inspect it after creation. Do not blindly repeat uncertain creation.",
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const travelDetails = input.travelDetails;
        if (travelDetails !== undefined) {
            if (!Object.values(travelDetails).some((value) => value !== undefined)) {
                throw new Error('validation_failed: travelDetails must include at least one trip detail field.');
            }
            if (travelDetails.departureDate !== undefined && travelDetails.returnDate !== undefined && travelDetails.returnDate < travelDetails.departureDate) {
                throw new Error(
                    `invalid_date_range: returnDate ${travelDetails.returnDate} precedes departureDate ${travelDetails.departureDate}. Correct the trip's calendar dates.`
                );
            }
        }

        const body: Record<string, unknown> = {
            title: input.title,
            employee: { id: toProviderId(input.employeeId, 'employeeId') },
            ...(input.projectId !== undefined && { project: { id: toProviderId(input.projectId, 'projectId') } }),
            ...(input.departmentId !== undefined && { department: { id: toProviderId(input.departmentId, 'departmentId') } }),
            ...(input.isChargeable !== undefined && { isChargeable: input.isChargeable }),
            ...(travelDetails !== undefined && {
                travelDetails: {
                    ...(travelDetails.purpose !== undefined && { purpose: travelDetails.purpose }),
                    ...(travelDetails.isDayTrip !== undefined && { isDayTrip: travelDetails.isDayTrip }),
                    ...(travelDetails.returnDate !== undefined && { returnDate: travelDetails.returnDate }),
                    ...(travelDetails.destination !== undefined && { destination: travelDetails.destination }),
                    ...(travelDetails.departureDate !== undefined && { departureDate: travelDetails.departureDate }),
                    ...(travelDetails.departureFrom !== undefined && { departureFrom: travelDetails.departureFrom }),
                    ...(travelDetails.isForeignTravel !== undefined && { isForeignTravel: travelDetails.isForeignTravel }),
                    ...(travelDetails.detailedJourneyDescription !== undefined && { detailedJourneyDescription: travelDetails.detailedJourneyDescription })
                }
            })
        };

        let responseData: unknown;
        // @allowTryCatch: Provider HTTP failures are mapped to the tool's public error codes; unmapped errors are rethrown unchanged.
        try {
            // https://tripletex.no/v2-docs/#/travelExpense/TravelExpense_post
            const response = await nango.post({
                endpoint: '/travelExpense',
                data: body,
                // Non-idempotent create: retrying after a lost response would create a duplicate report.
                retries: 0
            });
            responseData = response.data;
        } catch (error) {
            const providerError = ProviderHttpErrorSchema.safeParse(error);
            const status = providerError.success ? providerError.data.response?.status : undefined;
            const data = providerError.success ? providerError.data.response?.data : undefined;
            if (status === 403) {
                throw new Error(
                    `permission_denied: Travel expense registration is not permitted for the employee.${describeProviderFailure(data)} Ask an administrator to grant registration access.`
                );
            }
            if (status === 404 || ((status === 400 || status === 422) && referencesMissing(data))) {
                throw new Error(
                    `invalid_reference: Employee/project/department is missing or unavailable.${describeProviderFailure(data)} Correct IDs using current company records.`
                );
            }
            if (status === 400 || status === 422) {
                throw new Error(
                    `validation_failed: Tripletex rejected the report or trip details.${describeProviderFailure(data)} Correct the fields indicated by the provider.`
                );
            }
            throw error;
        }

        const parsed = CreateTravelExpenseResponseSchema.safeParse(responseData);
        if (!parsed.success) {
            throw new Error(
                'write_result_unknown: Tripletex returned a successful creation response that cannot be mapped. Use `list-travel-expenses` for the employee and trip, then inspect matches before creating again.'
            );
        }

        const created = parsed.data.value;
        return {
            id: created.id.toString(10),
            ...(created.state !== undefined && { state: created.state }),
            ...(created.title !== undefined && { title: created.title }),
            ...(created.version !== undefined && created.version !== null && { version: created.version })
        };
    }
});

export default tool;
