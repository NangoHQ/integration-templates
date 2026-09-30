import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        opportunity_id: z.string().describe('Unique identifier (GUID) of the opportunity to retrieve. Example: "e90a0493-e8f0-ea11-a815-000d3a1b14a2".'),
        select: z
            .array(z.string())
            .optional()
            .describe(
                'Optional list of opportunity attribute logical names to return, sent as the OData $select query option. Omit to return all attributes. Example: ["name", "estimatedvalue", "estimatedclosedate"].'
            )
    })
    .describe('Input for retrieving a single opportunity by id.');

const OutputSchema = z
    .looseObject({
        opportunityid: z.string().describe('Unique identifier (GUID) of the opportunity.'),
        name: z.string().nullable().optional().describe('Name (topic) of the opportunity. Null when not set.'),
        description: z.string().nullable().optional().describe('Description of the opportunity. Null when not set.'),
        estimatedvalue: z.number().nullable().optional().describe('Estimated revenue of the opportunity in the transaction currency. Null when not set.'),
        estimatedvalue_base: z.number().nullable().optional().describe('Estimated revenue converted to the organization base currency. Null when not set.'),
        estimatedclosedate: z
            .string()
            .nullable()
            .optional()
            .describe('Estimated close date of the opportunity as a date string, for example "2026-10-23". Null when not set.'),
        actualvalue: z
            .number()
            .nullable()
            .optional()
            .describe('Actual revenue of the opportunity in the transaction currency once closed. Null while the opportunity is open.'),
        actualclosedate: z
            .string()
            .nullable()
            .optional()
            .describe('Actual close date of the opportunity as a date string. Null while the opportunity is open.'),
        closeprobability: z.number().nullable().optional().describe('Probability of closing the opportunity, as an integer from 0 to 100. Null when not set.'),
        statecode: z.number().nullable().optional().describe('State of the opportunity: 0 = Open, 1 = Won, 2 = Lost.'),
        statuscode: z.number().nullable().optional().describe('Detailed status of the opportunity within its state, for example 1 = In Progress.'),
        salesstagecode: z.number().nullable().optional().describe('Sales stage code of the opportunity, for example 1 = Qualify. Null when not set.'),
        stepname: z.string().nullable().optional().describe('Name of the current business process flow stage, for example "1-Qualify". Null when not set.'),
        createdon: z.string().nullable().optional().describe('Date and time the opportunity was created, in ISO 8601 UTC format.'),
        modifiedon: z.string().nullable().optional().describe('Date and time the opportunity was last modified, in ISO 8601 UTC format.'),
        _customerid_value: z
            .string()
            .nullable()
            .optional()
            .describe('GUID of the customer (account or contact) associated with the opportunity. Null when not set.'),
        _parentaccountid_value: z.string().nullable().optional().describe('GUID of the parent account of the opportunity. Null when not set.'),
        _parentcontactid_value: z.string().nullable().optional().describe('GUID of the parent contact of the opportunity. Null when not set.'),
        _ownerid_value: z.string().nullable().optional().describe('GUID of the user or team that owns the opportunity. Null when not set.'),
        _originatingleadid_value: z.string().nullable().optional().describe('GUID of the lead the opportunity originated from. Null when not set.'),
        _transactioncurrencyid_value: z.string().nullable().optional().describe('GUID of the transaction currency set on the opportunity. Null when not set.')
    })
    .describe(
        'A single Dataverse opportunity record. Attributes with no value are returned as explicit nulls, and additional standard or custom attributes beyond the documented fields may be present, especially when requested via select.'
    );

/**
 * @tags: [read]
 * @tagReason: Performs a single read-only GET against the Dataverse Web API and never modifies provider data.
 * @pitfalls: Dataverse returns attributes that have no value as explicit nulls rather than omitting them, so any non-key field of the opportunity can be null in the response. When select is used, the response still includes system-populated fields beyond those requested, such as the record id and the transaction currency lookup.
 */
const action = createAction({
    description: 'Retrieve a single opportunity by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/opportunities(${encodeURIComponent(input.opportunity_id)})`,
            params: {
                ...(input.select !== undefined && input.select.length > 0 && { $select: input.select.join(',') })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
