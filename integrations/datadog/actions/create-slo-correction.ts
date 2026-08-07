import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    slo_id: z.string().describe('The ID of the SLO to apply the correction to. Example: "1ea8012ae6995e54a6e90c758380661e"'),
    category: z.enum(['Scheduled Maintenance', 'Deployment', 'Other', 'Outside Business Hours', 'Downtime']).describe('Category of the SLO correction.'),
    start: z.number().describe('Starting time of the correction window in Unix epoch seconds. Example: 1722566400'),
    end: z.number().describe('Ending time of the correction window in Unix epoch seconds. Example: 1722570000'),
    timezone: z.string().optional().describe('Timezone name for the correction window. Defaults to "UTC". Example: "America/New_York"'),
    description: z.string().optional().describe('Optional description of the correction. Example: "Planned database migration"')
});

const UserAttributesSchema = z
    .object({
        uuid: z.string().optional(),
        handle: z.string().optional(),
        email: z.string().optional(),
        name: z.string().optional(),
        icon: z.string().optional()
    })
    .passthrough();

const RelationshipDataSchema = z
    .object({
        type: z.string(),
        id: z.string(),
        attributes: UserAttributesSchema.optional()
    })
    .passthrough();

const CreatorRelationshipSchema = z
    .object({
        data: RelationshipDataSchema.optional()
    })
    .passthrough();

const RecurrenceSchema = z
    .object({
        type: z.string().optional(),
        period: z.number().optional(),
        rrule: z.string().optional(),
        duration: z.number().optional(),
        start: z.string().optional()
    })
    .passthrough();

const CorrectionAttributesSchema = z
    .object({
        slo_id: z.string(),
        category: z.string(),
        start: z.number(),
        end: z.number(),
        timezone: z.string(),
        description: z.string().optional(),
        creator: CreatorRelationshipSchema.optional(),
        created_at: z.number().nullable().optional(),
        modified_at: z.number().nullable().optional(),
        modified_by: CreatorRelationshipSchema.optional(),
        recurrence: RecurrenceSchema.optional(),
        timezone_offset: z.number().optional()
    })
    .passthrough();

const ProviderCorrectionSchema = z.object({
    id: z.string(),
    type: z.string(),
    attributes: CorrectionAttributesSchema
});

const ProviderResponseSchema = z.object({
    data: ProviderCorrectionSchema
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    slo_id: z.string(),
    category: z.string(),
    start: z.number(),
    end: z.number(),
    timezone: z.string(),
    description: z.string().optional(),
    creator: CreatorRelationshipSchema.optional(),
    created_at: z.number().optional(),
    modified_at: z.number().optional(),
    recurrence: RecurrenceSchema.optional()
});

const action = createAction({
    description: 'Create a new SLO correction window.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const body = {
            data: {
                type: 'correction',
                attributes: {
                    slo_id: input.slo_id,
                    category: input.category,
                    start: input.start,
                    end: input.end,
                    timezone: input.timezone ?? 'UTC',
                    ...(input.description !== undefined && { description: input.description })
                }
            }
        };

        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/service-level-objective-corrections/#create-an-slo-correction
            endpoint: 'v1/slo/correction',
            data: body,
            retries: 10
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse SLO correction response',
                details: parsed.error.issues
            });
        }

        const correction = parsed.data.data;

        return {
            id: correction.id,
            type: correction.type,
            slo_id: correction.attributes.slo_id,
            category: correction.attributes.category,
            start: correction.attributes.start,
            end: correction.attributes.end,
            timezone: correction.attributes.timezone,
            ...(correction.attributes.description !== undefined && { description: correction.attributes.description }),
            ...(correction.attributes.creator !== undefined && { creator: correction.attributes.creator }),
            ...(correction.attributes.created_at != null && { created_at: correction.attributes.created_at }),
            ...(correction.attributes.modified_at != null && { modified_at: correction.attributes.modified_at }),
            ...(correction.attributes.recurrence !== undefined && { recurrence: correction.attributes.recurrence })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
