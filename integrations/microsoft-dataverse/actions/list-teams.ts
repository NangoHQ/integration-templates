import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        limit: z
            .number()
            .int()
            .min(1)
            .max(5000)
            .optional()
            .describe(
                'Maximum number of teams to return in one page (sent as OData $top). When omitted, the organization default page size is used. Example: 50'
            ),
        next_link: z
            .string()
            .url()
            .optional()
            .describe('Full "@odata.nextLink" URL returned by a previous List Teams call, used to fetch the next page. Omit for the first page.')
    })
    .describe('Input for listing Dataverse teams. All fields are optional; call with no arguments to list the first page of teams.');

const TeamSchema = z.object({
    id: z.string().describe('Unique identifier of the team (teamid GUID). Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"'),
    name: z.string().optional().describe('Display name of the team.'),
    description: z.string().optional().describe('Description of the team. Omitted when empty.'),
    email_address: z.string().optional().describe('Email address associated with the team. Omitted when empty.'),
    team_type: z
        .number()
        .optional()
        .describe(
            'Type of the team as a Dataverse option set value: 0 = Owner, 1 = Access, 2 = Microsoft Entra ID Security Group, 3 = Microsoft Entra ID Office Group.'
        ),
    membership_type: z
        .number()
        .optional()
        .describe(
            'Membership type for Microsoft Entra ID-linked teams: 0 = Members and guests, 1 = Members, 2 = Owners, 3 = Guests. Omitted for teams that are not Entra ID-linked.'
        ),
    is_default: z.boolean().optional().describe('Whether this is the default team of the root business unit of the organization.'),
    azure_active_directory_object_id: z
        .string()
        .optional()
        .describe('Microsoft Entra ID (Azure AD) object ID of the linked group, present for Entra ID-linked teams. Omitted otherwise.'),
    created_on: z.string().optional().describe('ISO 8601 timestamp of when the team was created. Example: "2024-01-15T09:30:00Z"'),
    modified_on: z.string().optional().describe('ISO 8601 timestamp of when the team was last modified. Example: "2024-06-01T12:00:00Z"')
});

const OutputSchema = z
    .object({
        teams: z.array(TeamSchema).describe('The page of teams returned by Dataverse, ordered by name.'),
        next_link: z
            .string()
            .optional()
            .describe('Full "@odata.nextLink" URL for fetching the next page, present only when more pages exist. Pass it back as the "next_link" input.')
    })
    .describe('Result of listing Dataverse teams.');

const ProviderTeamSchema = z.object({
    teamid: z.string(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    emailaddress: z.string().nullable(),
    teamtype: z.number().nullable(),
    membershiptype: z.number().nullable(),
    isdefault: z.boolean().nullable(),
    azureactivedirectoryobjectid: z.string().nullable(),
    createdon: z.string().nullable(),
    modifiedon: z.string().nullable()
});

const ProviderListResponseSchema = z.object({
    value: z.array(ProviderTeamSchema),
    '@odata.nextLink': z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Only performs read-only GET requests against the Dataverse teams entity set; it never mutates provider data.
 * @pitfalls: Results include the organization's default business unit team and auto-provisioned system teams (for example bot or Microsoft Entra ID-linked teams), not only user-created teams. A provided limit hard-caps the result with no truncation signal, so a capped list looks identical to a complete one; next_link only appears when the organization's server-side page size (typically 5000 records) is exceeded.
 */
const action = createAction({
    description: 'List Dataverse teams (read-only).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const nextLinkUrl = input.next_link ? new URL(input.next_link) : undefined;
        const endpoint = nextLinkUrl ? nextLinkUrl.pathname : '/api/data/v9.2/teams';
        const params: Record<string, string | number> = nextLinkUrl
            ? Object.fromEntries(nextLinkUrl.searchParams)
            : {
                  $select: 'teamid,name,description,emailaddress,teamtype,membershiptype,isdefault,azureactivedirectoryobjectid,createdon,modifiedon',
                  $orderby: 'name asc',
                  ...(input.limit !== undefined && { $top: input.limit })
              };

        const config: ProxyConfiguration = {
            // Team entity collection: https://learn.microsoft.com/en-us/power-apps/developer/data-platform/reference/entities/team
            endpoint,
            params,
            retries: 3
        };
        const response = await nango.get(config);

        const parsed = ProviderListResponseSchema.parse(response.data);

        return {
            teams: parsed.value.map((team) => ({
                id: team.teamid,
                ...(team.name != null && { name: team.name }),
                ...(team.description != null && { description: team.description }),
                ...(team.emailaddress != null && { email_address: team.emailaddress }),
                ...(team.teamtype != null && { team_type: team.teamtype }),
                ...(team.membershiptype != null && { membership_type: team.membershiptype }),
                ...(team.isdefault != null && { is_default: team.isdefault }),
                ...(team.azureactivedirectoryobjectid != null && { azure_active_directory_object_id: team.azureactivedirectoryobjectid }),
                ...(team.createdon != null && { created_on: team.createdon }),
                ...(team.modifiedon != null && { modified_on: team.modifiedon })
            })),
            ...(parsed['@odata.nextLink'] != null && { next_link: parsed['@odata.nextLink'] })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
