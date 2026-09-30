import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const InputSchema = z
    .object({
        name: z.string().min(1).describe('Name (topic) of the opportunity. Example: "10 Coffee Makers for Fabrikam, Inc."'),
        parent_account_id: z
            .string()
            .regex(GUID_REGEX, 'parent_account_id must be a GUID')
            .optional()
            .describe(
                'GUID of the account to set as the opportunity customer through the customerid lookup. Mutually exclusive with parent_contact_id. Example: "88cea450-cb0c-ea11-a813-000d3a1b1223"'
            ),
        parent_contact_id: z
            .string()
            .regex(GUID_REGEX, 'parent_contact_id must be a GUID')
            .optional()
            .describe(
                'GUID of the contact to set as the opportunity customer through the customerid lookup. Mutually exclusive with parent_account_id. Example: "1b2c3d4e-5f6a-7b8c-9d0e-1f2a3b4c5d6e"'
            )
    })
    .describe('Input for creating a sales opportunity in Dataverse');

const OutputSchema = z
    .object({
        id: z.string().describe('GUID of the newly created opportunity. Example: "2c3d4e5f-6a7b-8c9d-0e1f-2a3b4c5d6e7f"'),
        name: z.string().describe('Name (topic) of the newly created opportunity as stored in Dataverse')
    })
    .describe('The created opportunity, read back from Dataverse after creation');

const OpportunityReadSchema = z.object({
    opportunityid: z.string(),
    name: z.string()
});

/**
 * @tags: [read, write]
 * @tagReason: Creates the opportunity with a POST, then reads the created record back with a GET to return its stored state.
 * @pitfalls: The Dynamics 365 app marks the Customer lookup as required, but the Web API does not enforce this: omitting both parent_account_id and parent_contact_id creates an opportunity with no linked customer.
 */
const action = createAction({
    description: 'Create a sales opportunity',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.parent_account_id !== undefined && input.parent_contact_id !== undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'An opportunity has a single customer. Provide either parent_account_id or parent_contact_id, not both.'
            });
        }

        const createConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/create-entity-web-api
            endpoint: '/api/data/v9.2/opportunities',
            data: {
                name: input.name,
                ...(input.parent_account_id !== undefined && { 'customerid_account@odata.bind': `/accounts(${encodeURIComponent(input.parent_account_id)})` }),
                ...(input.parent_contact_id !== undefined && { 'customerid_contact@odata.bind': `/contacts(${encodeURIComponent(input.parent_contact_id)})` })
            },
            // Create is not idempotent: retrying a POST whose response was lost would create a duplicate opportunity.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries -- non-idempotent create must use retries: 0
            retries: 0
        };
        const createResponse = await nango.post<unknown>(createConfig);

        // Dataverse answers a create with 204 No Content; the new record id only appears in the OData-EntityId header.
        const entityIdHeader: unknown = createResponse.headers['odata-entityid'];
        if (typeof entityIdHeader !== 'string') {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Dataverse did not return an OData-EntityId header identifying the created opportunity.'
            });
        }
        const idMatch = /\(([0-9a-fA-F-]{36})\)/.exec(entityIdHeader);
        const opportunityId = idMatch?.[1];
        if (opportunityId === undefined) {
            throw new nango.ActionError({
                type: 'unexpected_response',
                message: 'Could not parse the created opportunity id from the OData-EntityId header.'
            });
        }

        const getConfig: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/retrieve-entity-using-web-api
            endpoint: `/api/data/v9.2/opportunities(${encodeURIComponent(opportunityId)})`,
            params: {
                $select: 'opportunityid,name'
            },
            retries: 3
        };
        const getResponse = await nango.get<unknown>(getConfig);
        const opportunity = OpportunityReadSchema.parse(getResponse.data);

        return {
            id: opportunity.opportunityid,
            name: opportunity.name
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
