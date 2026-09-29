import { z } from 'zod';
import { createAction } from 'nango';

// statuscode values that belong to a closed opportunity state (Won/Canceled/Out-Sold). A plain PATCH of statuscode alone
// does not run Dataverse's WinOpportunity/LoseOpportunity workflow, so these are rejected rather than silently accepted.
const CLOSED_STATUS_CODES = new Set([3, 4, 5]);

const InputSchema = z
    .object({
        opportunityId: z.string().describe('GUID of the opportunity to update. Example: "e90a0493-e8f0-ea11-a815-000d3a1b14a2"'),
        name: z
            .string()
            .optional()
            .describe('Topic of the opportunity. Maps to the name attribute, which Dataverse requires, so it cannot be cleared with null.'),
        description: z.string().nullable().optional().describe('Detailed description of the opportunity. Pass null to clear the current value.'),
        estimatedValue: z
            .number()
            .nullable()
            .optional()
            .describe("Estimated revenue in the opportunity's transaction currency. Maps to estimatedvalue. Pass null to clear."),
        estimatedCloseDate: z
            .string()
            .nullable()
            .optional()
            .describe('Estimated close date as "YYYY-MM-DD" or an ISO 8601 datetime. Maps to estimatedclosedate. Pass null to clear.'),
        closeProbability: z
            .number()
            .int()
            .min(0)
            .max(100)
            .nullable()
            .optional()
            .describe('Close probability between 0 and 100. Maps to closeprobability. Pass null to clear.'),
        budgetAmount: z
            .number()
            .nullable()
            .optional()
            .describe("Customer's budget in the opportunity's transaction currency. Maps to budgetamount. Pass null to clear."),
        currentSituation: z.string().nullable().optional().describe("Notes on the customer's current situation. Maps to currentsituation. Pass null to clear."),
        customerNeed: z.string().nullable().optional().describe("Notes on the customer's need. Maps to customerneed. Pass null to clear."),
        proposedSolution: z.string().nullable().optional().describe('Notes on the proposed solution. Maps to proposedsolution. Pass null to clear.'),
        salesStageCode: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe('Sales stage option-set value; 1 is the only option in a default org. Maps to salesstagecode. Pass null to clear.'),
        purchaseProcess: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe("Customer's purchase process: 0 = Individual, 1 = Committee, 2 = Unknown. Maps to purchaseprocess. Pass null to clear."),
        purchaseTimeframe: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe(
                'Purchase timeframe: 0 = Immediate, 1 = This Quarter, 2 = Next Quarter, 3 = This Year, 4 = Unknown. Maps to purchasetimeframe. Pass null to clear.'
            ),
        need: z
            .number()
            .int()
            .nullable()
            .optional()
            .describe("Customer's level of need: 0 = Must have, 1 = Should have, 2 = Good to have, 3 = No need. Maps to need. Pass null to clear."),
        discountAmount: z
            .number()
            .nullable()
            .optional()
            .describe("Discount amount in the opportunity's transaction currency. Maps to discountamount. Pass null to clear."),
        discountPercentage: z
            .number()
            .nullable()
            .optional()
            .describe('Discount percentage applied to the opportunity. Maps to discountpercentage. Pass null to clear.'),
        freightAmount: z
            .number()
            .nullable()
            .optional()
            .describe("Freight amount in the opportunity's transaction currency. Maps to freightamount. Pass null to clear."),
        statusCode: z
            .number()
            .int()
            .optional()
            .describe(
                "Status reason for an opportunity that is still open: 1 = In Progress or 2 = On Hold. Maps to statuscode. This action performs a plain PATCH with no statecode change, so it cannot close an opportunity: closed-state reasons (3 = Won, 4 = Canceled, 5 = Out-Sold) are rejected. Use Dataverse's dedicated WinOpportunity/LoseOpportunity bound actions to win or lose an opportunity, which this action does not implement. This field is required by Dataverse once set and cannot be cleared with null."
            )
    })
    .describe(
        "Partial update input for a Dataverse opportunity. Only opportunityId is required; provide at least one other field. Omitted fields are left unchanged and null clears a field's current value."
    );

const ProviderOpportunitySchema = z.object({
    opportunityid: z.string(),
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    estimatedvalue: z.number().nullable().optional(),
    estimatedclosedate: z.string().nullable().optional(),
    closeprobability: z.number().nullable().optional(),
    budgetamount: z.number().nullable().optional(),
    currentsituation: z.string().nullable().optional(),
    customerneed: z.string().nullable().optional(),
    proposedsolution: z.string().nullable().optional(),
    salesstagecode: z.number().nullable().optional(),
    purchaseprocess: z.number().nullable().optional(),
    purchasetimeframe: z.number().nullable().optional(),
    need: z.number().nullable().optional(),
    discountamount: z.number().nullable().optional(),
    discountpercentage: z.number().nullable().optional(),
    freightamount: z.number().nullable().optional(),
    statuscode: z.number().nullable().optional(),
    statecode: z.number().nullable().optional(),
    modifiedon: z.string().nullable().optional()
});

const OutputSchema = z
    .object({
        id: z.string().describe('GUID of the updated opportunity.'),
        name: z.string().optional().describe('Topic of the opportunity.'),
        description: z.string().optional().describe('Detailed description of the opportunity.'),
        estimatedValue: z.number().optional().describe("Estimated revenue in the opportunity's transaction currency."),
        estimatedCloseDate: z.string().optional().describe('Estimated close date as returned by Dataverse, date-only "YYYY-MM-DD" or an ISO 8601 datetime.'),
        closeProbability: z.number().optional().describe('Close probability between 0 and 100.'),
        budgetAmount: z.number().optional().describe("Customer's budget in the opportunity's transaction currency."),
        currentSituation: z.string().optional().describe("Notes on the customer's current situation."),
        customerNeed: z.string().optional().describe("Notes on the customer's need."),
        proposedSolution: z.string().optional().describe('Notes on the proposed solution.'),
        salesStageCode: z.number().optional().describe('Sales stage option-set value.'),
        purchaseProcess: z.number().optional().describe("Customer's purchase process option-set value."),
        purchaseTimeframe: z.number().optional().describe('Purchase timeframe option-set value.'),
        need: z.number().optional().describe("Customer's level of need option-set value."),
        discountAmount: z.number().optional().describe("Discount amount in the opportunity's transaction currency."),
        discountPercentage: z.number().optional().describe('Discount percentage applied to the opportunity.'),
        freightAmount: z.number().optional().describe("Freight amount in the opportunity's transaction currency."),
        statusCode: z.number().optional().describe('Status reason option-set value (1 = In Progress, 2 = On Hold, 3 = Won, 4 = Canceled, 5 = Out-Sold).'),
        stateCode: z.number().optional().describe('State option-set value: 0 = Open, 1 = Won, 2 = Lost.'),
        modifiedOn: z.string().optional().describe('ISO 8601 timestamp of the last modification. Example: "2026-09-18T19:44:35Z"')
    })
    .describe('The opportunity after the update. Fields that are empty in Dataverse are omitted from the response.');

/**
 * @tags: [read, write]
 * @tagReason: Updates an opportunity's fields with a PATCH and reads the updated record back with a GET.
 * @pitfalls: Passing null for a nullable field clears its current value on the opportunity; omit the field entirely to leave it unchanged.
 */
const action = createAction({
    description: "Update an opportunity's fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.statusCode !== undefined && CLOSED_STATUS_CODES.has(input.statusCode)) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message:
                    "statusCode must be a status reason valid for an open opportunity (1 = In Progress, 2 = On Hold). Closed-state reasons (3 = Won, 4 = Canceled, 5 = Out-Sold) are rejected because this action only performs a plain PATCH; use Dataverse's dedicated WinOpportunity/LoseOpportunity bound actions to close an opportunity."
            });
        }

        const data: Record<string, string | number | null> = {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.estimatedValue !== undefined && { estimatedvalue: input.estimatedValue }),
            ...(input.estimatedCloseDate !== undefined && { estimatedclosedate: input.estimatedCloseDate }),
            ...(input.closeProbability !== undefined && { closeprobability: input.closeProbability }),
            ...(input.budgetAmount !== undefined && { budgetamount: input.budgetAmount }),
            ...(input.currentSituation !== undefined && { currentsituation: input.currentSituation }),
            ...(input.customerNeed !== undefined && { customerneed: input.customerNeed }),
            ...(input.proposedSolution !== undefined && { proposedsolution: input.proposedSolution }),
            ...(input.salesStageCode !== undefined && { salesstagecode: input.salesStageCode }),
            ...(input.purchaseProcess !== undefined && { purchaseprocess: input.purchaseProcess }),
            ...(input.purchaseTimeframe !== undefined && { purchasetimeframe: input.purchaseTimeframe }),
            ...(input.need !== undefined && { need: input.need }),
            ...(input.discountAmount !== undefined && { discountamount: input.discountAmount }),
            ...(input.discountPercentage !== undefined && { discountpercentage: input.discountPercentage }),
            ...(input.freightAmount !== undefined && { freightamount: input.freightAmount }),
            ...(input.statusCode !== undefined && { statuscode: input.statusCode })
        };

        if (Object.keys(data).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one opportunity field to update alongside opportunityId.'
            });
        }

        const endpoint = `/api/data/v9.2/opportunities(${encodeURIComponent(input.opportunityId)})`;

        // Updating is idempotent here: a retry replays the exact same field values, so it cannot duplicate side effects.
        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/update-delete-entities-using-web-api
        await nango.patch({
            endpoint,
            data,
            retries: 3
        });

        // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
        const response = await nango.get({
            endpoint,
            params: {
                $select:
                    'opportunityid,name,description,estimatedvalue,estimatedclosedate,closeprobability,budgetamount,currentsituation,customerneed,proposedsolution,salesstagecode,purchaseprocess,purchasetimeframe,need,discountamount,discountpercentage,freightamount,statuscode,statecode,modifiedon'
            },
            retries: 3
        });

        const opportunity = ProviderOpportunitySchema.parse(response.data);

        return {
            id: opportunity.opportunityid,
            ...(opportunity.name != null && { name: opportunity.name }),
            ...(opportunity.description != null && { description: opportunity.description }),
            ...(opportunity.estimatedvalue != null && { estimatedValue: opportunity.estimatedvalue }),
            ...(opportunity.estimatedclosedate != null && { estimatedCloseDate: opportunity.estimatedclosedate }),
            ...(opportunity.closeprobability != null && { closeProbability: opportunity.closeprobability }),
            ...(opportunity.budgetamount != null && { budgetAmount: opportunity.budgetamount }),
            ...(opportunity.currentsituation != null && { currentSituation: opportunity.currentsituation }),
            ...(opportunity.customerneed != null && { customerNeed: opportunity.customerneed }),
            ...(opportunity.proposedsolution != null && { proposedSolution: opportunity.proposedsolution }),
            ...(opportunity.salesstagecode != null && { salesStageCode: opportunity.salesstagecode }),
            ...(opportunity.purchaseprocess != null && { purchaseProcess: opportunity.purchaseprocess }),
            ...(opportunity.purchasetimeframe != null && { purchaseTimeframe: opportunity.purchasetimeframe }),
            ...(opportunity.need != null && { need: opportunity.need }),
            ...(opportunity.discountamount != null && { discountAmount: opportunity.discountamount }),
            ...(opportunity.discountpercentage != null && { discountPercentage: opportunity.discountpercentage }),
            ...(opportunity.freightamount != null && { freightAmount: opportunity.freightamount }),
            ...(opportunity.statuscode != null && { statusCode: opportunity.statuscode }),
            ...(opportunity.statecode != null && { stateCode: opportunity.statecode }),
            ...(opportunity.modifiedon != null && { modifiedOn: opportunity.modifiedon })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
