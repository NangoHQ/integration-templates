import { z } from 'zod';
import { createTool } from 'nango';

const OfferStatusSchema = z.enum([
    'WaitingOnOfferCreation',
    'WaitingOnApprovalStart',
    'WaitingOnOfferApproval',
    'WaitingOnApprovalDefinition',
    'WaitingOnCandidateResponse',
    'CandidateRejected',
    'CandidateAccepted',
    'OfferCancelled'
]);

const ApprovalStatusSchema = z.enum(['Approved', 'WaitingOnApprovals', 'Declined']);

const AcceptanceStatusSchema = z.enum(['Accepted', 'Declined', 'Pending', 'Created', 'Cancelled']);

const InputSchema = z
    .object({
        limit: z.number().int().min(1).max(100).optional().describe('Maximum offers in one page; defaults to 25.'),
        cursor: z.string().min(1).optional().describe('Opaque continuation for this connection and unchanged filters; omit to begin.'),
        createdAfter: z.iso
            .datetime({ offset: true })
            .meta({ pattern: '(Z|[+-][0-9]{2}:[0-9]{2})$' })
            .optional()
            .describe('Exclusive creation cutoff with explicit offset; must be exactly representable in whole milliseconds.'),
        applicationId: z.uuid().optional().describe("Restrict to this application's offers; omit for all applications."),
        offerStatuses: z
            .array(OfferStatusSchema)
            .min(1)
            .refine((statuses) => new Set(statuses).size === statuses.length, { message: 'offerStatuses must not contain duplicate values.' })
            .meta({ uniqueItems: true })
            .optional()
            .describe('Include offers in any of these process states; omit for no state filter.'),
        approvalStatuses: z
            .array(ApprovalStatusSchema)
            .min(1)
            .refine((statuses) => new Set(statuses).size === statuses.length, { message: 'approvalStatuses must not contain duplicate values.' })
            .meta({ uniqueItems: true })
            .optional()
            .describe('Filter latest-version approval states; currently matches imported offers only, not approvals made in Ashby.'),
        acceptanceStatuses: z
            .array(AcceptanceStatusSchema)
            .min(1)
            .refine((statuses) => new Set(statuses).size === statuses.length, { message: 'acceptanceStatuses must not contain duplicate values.' })
            .meta({ uniqueItems: true })
            .optional()
            .describe('Include offers with any of these candidate acceptance states.')
    })
    .describe('Filters for listing one page of offers; all fields are optional and combine upstream.');

const OfferVersionSchema = z.object({
    id: z.string().describe('Offer version ID used by approval tools.'),
    salary: z
        .object({
            value: z.number().describe('Currency amount in provider currency units; no cents conversion.'),
            currencyCode: z.string().describe('ISO 4217 currency code.')
        })
        .nullable()
        .optional()
        .describe('Salary amount without inferred pay interval; null when unset.'),
    createdAt: z.iso.datetime({ offset: true }).describe('Version creation instant in UTC Z, preserving fractional precision.'),
    openingId: z.string().nullable().optional().describe('Associated opening ID, or null when unset.'),
    startDate: z.iso.date().nullable().optional().describe('Employment start calendar date, not an instant; null when unset.'),
    approvalStatus: z
        .literal(['Approved', 'WaitingOnApprovals', 'Declined', null])
        .optional()
        .describe('Version approval state, null if none or cancelled before decision.')
});

const OutputSchema = z
    .object({
        items: z
            .array(
                z.object({
                    id: z.string().describe('Offer identifier.'),
                    decidedAt: z.iso
                        .datetime({ offset: true })
                        .nullable()
                        .optional()
                        .describe('Candidate acceptance or rejection instant in UTC Z, or null; omitted if not returned.'),
                    offerStatus: z.string().describe("Provider's offer-process state, distinct from acceptanceStatus."),
                    applicationId: z.string().describe('Associated application identifier.'),
                    latestVersion: OfferVersionSchema.nullable().optional().describe('Latest offer version; null or omitted remains distinct.'),
                    acceptanceStatus: z.string().describe('Candidate acceptance state: Accepted, Declined, Pending, Created, or Cancelled.')
                })
            )
            .describe('Offers in this provider-ordered page.'),
        nextCursor: z.string().optional().describe('Continuation for the next page; omitted at exhaustion. Expires at most 14 days after traversal start.')
    })
    .describe('One provider-ordered page of offers with their latest versions.');

const ProviderSalarySchema = z.object({
    value: z.number(),
    currencyCode: z.string()
});

const ProviderLatestVersionSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    salary: ProviderSalarySchema.nullable().optional(),
    openingId: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    approvalStatus: ApprovalStatusSchema.nullable().optional()
});

const ProviderOfferSchema = z.object({
    id: z.string(),
    applicationId: z.string(),
    acceptanceStatus: z.string(),
    offerStatus: z.string(),
    decidedAt: z.string().nullable().optional(),
    latestVersion: ProviderLatestVersionSchema.nullable().optional()
});

const ProviderSuccessSchema = z.object({
    success: z.literal(true),
    results: z.array(ProviderOfferSchema),
    nextCursor: z.string().optional(),
    moreDataAvailable: z.boolean().optional(),
    syncToken: z.string().optional()
});

const ProviderErrorSchema = z.object({
    success: z.literal(false),
    errors: z
        .array(
            z.union([
                z.string(),
                z.object({
                    code: z.string().optional(),
                    message: z.string().optional(),
                    parameter: z.string().optional()
                })
            ])
        )
        .optional(),
    errorInfo: z
        .object({
            code: z.string().optional(),
            message: z.string().optional()
        })
        .optional()
});

interface AshbyError {
    code: string | undefined;
    message: string | undefined;
}

function extractAshbyError(data: unknown): AshbyError | undefined {
    const parsed = ProviderErrorSchema.safeParse(data);
    if (!parsed.success) {
        return undefined;
    }
    const codes: string[] = [];
    const messages: string[] = [];
    for (const entry of parsed.data.errors ?? []) {
        if (typeof entry === 'string') {
            codes.push(entry);
        } else {
            if (entry.code !== undefined) {
                codes.push(entry.code);
            }
            if (entry.message !== undefined) {
                messages.push(entry.message);
            }
        }
    }
    return { code: parsed.data.errorInfo?.code ?? codes[0], message: parsed.data.errorInfo?.message ?? messages[0] };
}

function throwAshbyError(ashbyError: AshbyError | undefined, fallbackMessage: string): never {
    const message = ashbyError?.message ?? fallbackMessage;
    switch (ashbyError?.code) {
        case 'missing_endpoint_permission':
            throw new Error(`permission_denied: ${message}`);
        case 'next_cursor_expired':
            throw new Error(`next_cursor_expired: ${message}`);
        case 'cursor_invalid':
        case 'invalid_cursor':
            throw new Error(`invalid_cursor: ${message}`);
        case 'invalid_next_cursor':
            throw new Error(`invalid_next_cursor: ${message}`);
        default:
            throw new Error(`request_rejected: ${message}`);
    }
}

function getHttpErrorDetails(error: unknown): { status: number | undefined; data: unknown } {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return { status: undefined, data: undefined };
    }
    const response: unknown = error.response;
    if (typeof response !== 'object' || response === null) {
        return { status: undefined, data: undefined };
    }
    const status = 'status' in response && typeof response.status === 'number' ? response.status : undefined;
    const data: unknown = 'data' in response ? response.data : undefined;
    return { status, data };
}

function toEpochMilliseconds(value: string): number {
    const fractionMatch = /T[\d:.]*?\.(\d+)/.exec(value);
    let normalized = value;
    const digits = fractionMatch?.[1];
    if (digits !== undefined) {
        if (digits.length > 3 && /[^0]/.test(digits.slice(3))) {
            throw new Error(
                'unsupported_timestamp_precision: createdAfter cannot be converted exactly to whole milliseconds; supply at most millisecond-effective precision.'
            );
        }
        normalized = value.replace(`.${digits}`, `.${digits.slice(0, 3).padEnd(3, '0')}`);
    }
    const milliseconds = Date.parse(normalized);
    if (!Number.isSafeInteger(milliseconds)) {
        throw new Error('unsupported_timestamp_precision: createdAfter is outside the supported integer-millisecond range.');
    }
    return milliseconds;
}

function normalizeToUtcZ(value: string): string {
    if (value.endsWith('Z')) {
        return value;
    }
    const offsetMatch = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?([+-])(\d{2}):(\d{2})$/.exec(value);
    if (offsetMatch === null) {
        return value;
    }
    const [, localPart, fraction, sign, offsetHours, offsetMinutes] = offsetMatch;
    if (localPart === undefined || sign === undefined || offsetHours === undefined || offsetMinutes === undefined) {
        return value;
    }
    const localMilliseconds = Date.parse(`${localPart}Z`);
    if (Number.isNaN(localMilliseconds)) {
        return value;
    }
    const offsetMilliseconds = (Number(offsetHours) * 60 + Number(offsetMinutes)) * 60_000;
    const utcMilliseconds = sign === '+' ? localMilliseconds - offsetMilliseconds : localMilliseconds + offsetMilliseconds;
    const utcWholeSeconds = new Date(utcMilliseconds).toISOString().slice(0, 19);
    return `${utcWholeSeconds}${fraction ?? ''}Z`;
}

function mapLatestVersion(version: z.infer<typeof ProviderLatestVersionSchema>): z.infer<typeof OfferVersionSchema> {
    return {
        id: version.id,
        createdAt: normalizeToUtcZ(version.createdAt),
        ...(version.salary !== undefined && { salary: version.salary }),
        ...(version.openingId !== undefined && { openingId: version.openingId }),
        ...(version.startDate !== undefined && { startDate: version.startDate }),
        ...(version.approvalStatus !== undefined && { approvalStatus: version.approvalStatus })
    };
}

/**
 * @tags: [read]
 * @tagReason: Fetches one page of offers from Ashby and modifies nothing on the provider.
 * @pitfalls: The approvalStatuses filter matches imported offers only, not approvals made in Ashby. A page can be short or even empty while more results remain, so keep following nextCursor; each cursor expires 14 days after the traversal started, and an expired, malformed, or incompatible cursor fails the call, so browsing must restart without a cursor.
 */
const tool = createTool({
    name: 'list-offers',
    description:
        'List one page of offers and their latest versions, optionally filtered by application, creation time, process state, candidate acceptance state, or imported approval state.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use this to find offer IDs for `get-offer` and latestVersion IDs for approval actions. Pass nextCursor as cursor with the same filters to continue. The approvalStatuses filter currently matches imported offers only, not approvals made in Ashby. Each call returns at most 100 offers.',
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const createdAfterMs = input.createdAfter !== undefined ? toEpochMilliseconds(input.createdAfter) : undefined;

        const requestBody: {
            limit: number;
            cursor: string;
            createdAfter?: number;
            applicationId?: string;
            offerStatus?: z.infer<typeof OfferStatusSchema>[];
            approvalStatus?: z.infer<typeof ApprovalStatusSchema>[];
            acceptanceStatus?: z.infer<typeof AcceptanceStatusSchema>[];
        } = {
            limit: input.limit ?? 25,
            cursor: input.cursor ?? 'start',
            ...(createdAfterMs !== undefined && { createdAfter: createdAfterMs }),
            ...(input.applicationId !== undefined && { applicationId: input.applicationId }),
            ...(input.offerStatuses !== undefined && { offerStatus: input.offerStatuses }),
            ...(input.approvalStatuses !== undefined && { approvalStatus: input.approvalStatuses }),
            ...(input.acceptanceStatuses !== undefined && { acceptanceStatus: input.acceptanceStatuses })
        };

        let responseData: unknown;
        // @allowTryCatch: Ashby signals failures with 4xx statuses and/or a `success: false` body; both must be mapped to the tool's public error codes.
        try {
            // https://developers.ashbyhq.com/reference/offerlist.md
            const response = await nango.post({
                endpoint: '/offer.list',
                data: requestBody,
                // Read-only list call (POST is Ashby's RPC convention), so retrying a page fetch is safe.
                retries: 3
            });
            responseData = response.data;
        } catch (error: unknown) {
            const details = getHttpErrorDetails(error);
            const ashbyError = extractAshbyError(details.data);
            if (ashbyError !== undefined) {
                throwAshbyError(ashbyError, 'Ashby rejected the offer.list request.');
            }
            if (details.status === 401 || details.status === 403) {
                throw new Error('permission_denied: The API key cannot access offer.list. Ask an administrator to grant the offersRead permission.');
            }
            throw error;
        }

        const ashbyError = extractAshbyError(responseData);
        if (ashbyError !== undefined) {
            throwAshbyError(ashbyError, 'Ashby rejected the offer.list request.');
        }

        const parsed = ProviderSuccessSchema.parse(responseData);

        const items = parsed.results.map((offer) => ({
            id: offer.id,
            applicationId: offer.applicationId,
            acceptanceStatus: offer.acceptanceStatus,
            offerStatus: offer.offerStatus,
            ...(offer.decidedAt !== undefined && { decidedAt: offer.decidedAt === null ? null : normalizeToUtcZ(offer.decidedAt) }),
            ...(offer.latestVersion !== undefined && { latestVersion: offer.latestVersion === null ? null : mapLatestVersion(offer.latestVersion) })
        }));

        const output: z.infer<typeof OutputSchema> = { items };
        if (parsed.moreDataAvailable === true && typeof parsed.syncToken === 'string' && parsed.syncToken.length > 0) {
            output.nextCursor = parsed.syncToken;
        }
        return output;
    }
});

export default tool;
