import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        jobIds: z
            .array(z.uuid().describe('Job ID as a UUID.'))
            .optional()
            .meta({ uniqueItems: true })
            .describe('Initial associated job IDs; an empty array requests none.'),
        teamId: z.uuid().optional().describe('Associated department or team ID; omit for no explicit assignment.'),
        identifier: z.string().optional().describe('Human-readable opening identifier; omit to let Ashby choose its default.'),
        isBackfill: z.boolean().optional().describe("Whether this replaces an existing employee; omission uses Ashby's default."),
        description: z.string().optional().describe('Opening description as ordinary text; omit to leave unset.'),
        locationIds: z
            .array(z.uuid().describe('Location ID as a UUID.'))
            .optional()
            .meta({ uniqueItems: true })
            .describe('Initial associated location IDs; an empty array requests none.'),
        openingState: z
            .enum(['Draft', 'Approved', 'Open', 'Closed'])
            .optional()
            .describe('Initial lifecycle state; defaults to Draft. Non-draft states receive additional validation.'),
        employmentType: z
            .enum(['FullTime', 'PartTime', 'Intern', 'Contract', 'Temporary'])
            .optional()
            .describe("Employment category; omission uses Ashby's default."),
        targetHireDate: z.iso.date().optional().describe('Intended hire deadline as a YYYY-MM-DD calendar date.'),
        targetStartDate: z.iso.date().optional().describe('Intended employment start date as a YYYY-MM-DD calendar date.')
    })
    .describe('Planning attributes for the new headcount opening. Every field is optional; omitted fields use Ashby defaults.');

const OutputSchema = z
    .object({
        id: z.string().describe('Created opening ID, distinct from its human-readable identifier.'),
        isArchived: z.boolean().describe('Whether the created opening is archived.'),
        openingState: z.enum(['Draft', 'Approved', 'Open', 'Closed', 'Filled']).describe('Resulting lifecycle state reported by Ashby.')
    })
    .describe('Compact write receipt for the created opening.');

const OpeningCreateResponseSchema = z.discriminatedUnion('success', [
    z.object({
        success: z.literal(true),
        results: z.object({
            id: z.string(),
            isArchived: z.boolean(),
            openingState: z.enum(['Draft', 'Approved', 'Open', 'Closed', 'Filled'])
        })
    }),
    z.object({
        success: z.literal(false),
        errors: z
            .array(
                z.object({
                    message: z.string(),
                    parameter: z.string().optional()
                })
            )
            .optional()
    })
]);

/**
 * @tags: [write]
 * @tagReason: Creates a new opening in Ashby, a provider mutation; the tool performs no provider reads or deletes.
 * @pitfalls: Requires the jobsWrite permission. Requesting a non-Draft openingState triggers extra Ashby validation and can fail where the same values succeed as Draft. Custom field values cannot be set with this tool.
 */
const tool = createTool({
    name: 'create-opening',
    description: 'Create a headcount opening with planning dates, employment type, and initial job and location associations.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use for a new opening, not a job posting. Use `update-opening` for an existing opening. Omitted state creates a draft; other states require additional provider validation. Save the returned id for subsequent changes.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        // Creates one opening. Dates are sent unchanged as YYYY-MM-DD calendar dates; absent fields are omitted so Ashby defaults apply.
        // https://developers.ashbyhq.com/reference/openingcreate-1.md
        const response = await nango.post({
            endpoint: '/opening.create',
            data: {
                openingState: input.openingState ?? 'Draft',
                ...(input.jobIds !== undefined && { jobIds: input.jobIds }),
                ...(input.teamId !== undefined && { teamId: input.teamId }),
                ...(input.identifier !== undefined && { identifier: input.identifier }),
                ...(input.isBackfill !== undefined && { isBackfill: input.isBackfill }),
                ...(input.description !== undefined && { description: input.description }),
                ...(input.locationIds !== undefined && { locationIds: input.locationIds }),
                ...(input.employmentType !== undefined && { employmentType: input.employmentType }),
                ...(input.targetHireDate !== undefined && { targetHireDate: input.targetHireDate }),
                ...(input.targetStartDate !== undefined && { targetStartDate: input.targetStartDate })
            },
            // Not idempotent: opening.create has no idempotency key and a retry after a lost response would create a duplicate opening.
            retries: 0
        });

        const parsed = OpeningCreateResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(
                'write_result_unknown: Ashby returned a response that cannot be interpreted after the opening was submitted. Use `search-openings` with the identifier before deciding whether to create again.'
            );
        }

        if (parsed.data.success === false) {
            const errors = parsed.data.errors ?? [];
            const detail = errors.map((error) => error.message).join('; ') || 'Ashby rejected the request without an error message.';
            if (/permission|unauthorized|forbidden|jobswrite/i.test(detail)) {
                throw new Error(
                    `permission_denied: The key lacks jobsWrite permission or the actor cannot create the opening. Ask an administrator to grant opening-write access. Ashby reported: ${detail}`
                );
            }
            const badReference =
                errors.some((error) => error.parameter === 'jobIds' || error.parameter === 'locationIds' || error.parameter === 'teamId') ||
                /(job|location|team)[^;]*(not found|does not exist|invalid|unavailable)/i.test(detail);
            if (badReference) {
                throw new Error(
                    `invalid_reference: A supplied job, location, or team is unavailable or invalid for the opening. Correct the referenced IDs and retry. Ashby reported: ${detail}`
                );
            }
            throw new Error(
                `validation_failed: Ashby rejected the opening values or the requested non-draft state. Correct the reported fields or create a Draft first. Ashby reported: ${detail}`
            );
        }

        return {
            id: parsed.data.results.id,
            isArchived: parsed.data.results.isArchived,
            openingState: parsed.data.results.openingState
        };
    }
});

export default tool;
