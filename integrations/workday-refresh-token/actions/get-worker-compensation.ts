import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        workerId: z.string().describe('Workday worker ID. Example: "fa1a4057915f1010adcb915e0b120000"')
    })
    .describe("Input for retrieving a worker's compensation details.");

const BasePaySchema = z
    .object({
        amount: z.number().optional().describe('Base pay amount.'),
        currency: z.string().optional().describe('Currency code for the base pay.'),
        frequency: z.string().optional().describe('Pay frequency descriptor, e.g., Annual or Monthly.')
    })
    .optional()
    .describe('Base pay details for the worker.');

const CompensationPlanSchema = z
    .object({
        planId: z.string().optional().describe('Compensation plan identifier.'),
        planName: z.string().optional().describe('Compensation plan name.'),
        planType: z.string().optional().describe('Type of compensation plan, e.g., base, bonus, or allowance.')
    })
    .describe('An individual compensation plan assigned to the worker.');

const LocationSchema = z
    .object({
        id: z.string().optional().describe('Location ID.'),
        descriptor: z.string().optional().describe('Location display name.')
    })
    .describe('Worker location.');

const OrganizationSchema = z
    .object({
        id: z.string().optional().describe('Organization ID.'),
        descriptor: z.string().optional().describe('Organization display name.')
    })
    .describe('Supervisory organization.');

const OutputSchema = z
    .object({
        workerId: z.string().describe('Workday worker ID.'),
        descriptor: z.string().optional().describe('Worker display name or number.'),
        businessTitle: z.string().optional().describe('Worker business title.'),
        yearsOfService: z.string().optional().describe('Years of service.'),
        isManager: z.boolean().optional().describe('Whether the worker is a manager.'),
        primaryWorkPhone: z.string().optional().describe('Primary work phone number.'),
        location: LocationSchema.optional(),
        primarySupervisoryOrganization: OrganizationSchema.optional(),
        basePay: BasePaySchema,
        compensationPlans: z.array(CompensationPlanSchema).optional().describe('List of compensation plans for the worker.')
    })
    .describe("A worker's profile and compensation details.");

/**
 * @tags: [read]
 * @tagReason: Retrieves a worker's existing profile and compensation details from the provider.
 * @pitfalls: Returns general worker profile data and omits basePay and compensationPlans on tenants that do not expose detailed compensation.
 */
const action = createAction({
    description: "Get a worker's compensation details (base pay, compensation plans, etc.).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const metadataSchema = z.object({
            tenant: z.string()
        });
        const metadataResult = metadataSchema.safeParse(metadata);

        if (!metadataResult.success) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'tenant is required in metadata.'
            });
        }

        const tenant = metadataResult.data.tenant;

        // https://community.workday.com/api
        const response = await nango.get({
            endpoint: `compensation/v2/${encodeURIComponent(tenant)}/workers/${encodeURIComponent(input.workerId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Worker compensation not found.'
            });
        }

        const providerSchema = z
            .object({
                id: z.string().optional(),
                descriptor: z.string().optional(),
                businessTitle: z.string().optional(),
                yearsOfService: z.string().optional(),
                isManager: z.boolean().optional(),
                primaryWorkPhone: z.string().optional(),
                location: z
                    .object({
                        id: z.string().optional(),
                        descriptor: z.string().optional()
                    })
                    .optional(),
                primarySupervisoryOrganization: z
                    .object({
                        id: z.string().optional(),
                        descriptor: z.string().optional()
                    })
                    .optional(),
                basePay: z
                    .object({
                        amount: z.number().optional(),
                        currency: z.string().optional(),
                        frequency: z.string().optional()
                    })
                    .optional(),
                compensationPlans: z
                    .array(
                        z.object({
                            id: z.string().optional(),
                            name: z.string().optional(),
                            type: z.string().optional()
                        })
                    )
                    .optional()
            })
            .passthrough();

        const parsed = providerSchema.parse(response.data);

        return {
            workerId: parsed.id ?? input.workerId,
            ...(parsed.descriptor !== undefined && { descriptor: parsed.descriptor }),
            ...(parsed.businessTitle !== undefined && { businessTitle: parsed.businessTitle }),
            ...(parsed.yearsOfService !== undefined && { yearsOfService: parsed.yearsOfService }),
            ...(parsed.isManager !== undefined && { isManager: parsed.isManager }),
            ...(parsed.primaryWorkPhone !== undefined && { primaryWorkPhone: parsed.primaryWorkPhone }),
            ...(parsed.location !== undefined && {
                location: {
                    ...(parsed.location.id !== undefined && { id: parsed.location.id }),
                    ...(parsed.location.descriptor !== undefined && { descriptor: parsed.location.descriptor })
                }
            }),
            ...(parsed.primarySupervisoryOrganization !== undefined && {
                primarySupervisoryOrganization: {
                    ...(parsed.primarySupervisoryOrganization.id !== undefined && { id: parsed.primarySupervisoryOrganization.id }),
                    ...(parsed.primarySupervisoryOrganization.descriptor !== undefined && {
                        descriptor: parsed.primarySupervisoryOrganization.descriptor
                    })
                }
            }),
            ...(parsed.basePay !== undefined && {
                basePay: {
                    ...(parsed.basePay.amount !== undefined && { amount: parsed.basePay.amount }),
                    ...(parsed.basePay.currency !== undefined && { currency: parsed.basePay.currency }),
                    ...(parsed.basePay.frequency !== undefined && { frequency: parsed.basePay.frequency })
                }
            }),
            ...(parsed.compensationPlans !== undefined && {
                compensationPlans: parsed.compensationPlans.map((plan) => ({
                    ...(plan.id !== undefined && { planId: plan.id }),
                    ...(plan.name !== undefined && { planName: plan.name }),
                    ...(plan.type !== undefined && { planType: plan.type })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
