import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        email: z.email().describe("Recipient's email address; sent unchanged without forced lowercasing."),
        organizationId: z.url().describe('Canonical organization URI to invite the person into.')
    })
    .describe('Recipient email and target organization for a new organization invitation.');

const OutputSchema = z
    .object({
        id: z.string().describe('Canonical organization invitation URI.'),
        email: z.string().describe("Invited person's email address."),
        status: z.enum(['pending', 'accepted', 'declined']).describe('Current invitation lifecycle status.'),
        userId: z.string().optional().describe('Canonical user reference after acceptance; omitted until supplied.'),
        createdAt: z.iso.datetime({ offset: true }).describe('Invitation creation instant in UTC Z preserving fractional precision.'),
        updatedAt: z.iso.datetime({ offset: true }).describe('Invitation update instant in UTC Z preserving fractional precision.'),
        lastSentAt: z.iso.datetime({ offset: true }).nullable().describe('Last invitation send instant in UTC Z; null if not sent.'),
        organizationId: z.string().describe('Canonical organization reference.')
    })
    .describe('The created organization invitation record.');

const OrganizationInvitationSchema = z.object({
    uri: z.string(),
    organization: z.string(),
    email: z.string(),
    status: z.enum(['pending', 'accepted', 'declined']),
    created_at: z.string(),
    updated_at: z.string(),
    last_sent_at: z.string().nullable(),
    user: z.string().optional()
});

const CreateInvitationResponseSchema = z.object({
    resource: OrganizationInvitationSchema
});

const ProviderErrorBodySchema = z.object({
    title: z.string().optional(),
    message: z.string().optional(),
    details: z
        .array(
            z.object({
                message: z.string().optional(),
                parameter: z.string().optional(),
                code: z.string().optional()
            })
        )
        .optional()
});

const ProxyErrorSchema = z.object({
    response: z.object({
        status: z.number(),
        data: z.unknown()
    })
});

const ISO_DATETIME_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Normalizes an ISO 8601 date-time to UTC with a Z designator. Offsets are applied
 * to the whole-second part so the original fractional digits survive untouched.
 */
function normalizeToUtc(value: string): string {
    const match = ISO_DATETIME_PATTERN.exec(value);
    if (match === null || match[1] === undefined || match[3] === undefined) {
        throw new Error(
            'write_result_unknown: The submitted invitation response cannot be interpreted (unexpected timestamp format). Check list-organization-invitations before resending.'
        );
    }
    const dateTime = match[1];
    const zone = match[3];
    if (zone === 'Z') {
        return value;
    }
    const fraction = match[2] ?? '';
    const sign = zone.startsWith('-') ? -1 : 1;
    const offsetMinutesTotal = Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6));
    const shiftedMs = Date.parse(`${dateTime}Z`) - sign * offsetMinutesTotal * 60000;
    if (Number.isNaN(shiftedMs)) {
        throw new Error(
            'write_result_unknown: The submitted invitation response cannot be interpreted (unparseable timestamp). Check list-organization-invitations before resending.'
        );
    }
    const base = new Date(shiftedMs).toISOString().slice(0, 19);
    return `${base}${fraction}Z`;
}

/** Extracts the opaque organization identifier from its canonical URI. */
function extractOrganizationUuid(organizationId: string): string {
    const match = /\/organizations\/([^/]+)\/?$/.exec(new URL(organizationId).pathname);
    const uuid = match?.[1];
    if (uuid === undefined) {
        throw new Error(
            'invalid_request: organizationId must be a canonical organization URI such as https://api.calendly.com/organizations/ORGANIZATION_ID. Check the recipient address and organization.'
        );
    }
    return uuid;
}

/** Maps a failed Calendly response to the public error codes of this tool. */
function classifyProviderError(error: unknown): Error {
    const parsedError = ProxyErrorSchema.safeParse(error);
    if (!parsedError.success) {
        return error instanceof Error
            ? error
            : new Error('provider_error: Calendly reports a server error. Check invitations for that email before resending.');
    }

    const { status, data } = parsedError.data.response;
    const parsedBody = ProviderErrorBodySchema.safeParse(data);
    const texts: string[] = [];
    if (parsedBody.success) {
        if (parsedBody.data.title !== undefined) {
            texts.push(parsedBody.data.title);
        }
        if (parsedBody.data.message !== undefined) {
            texts.push(parsedBody.data.message);
        }
        for (const detail of parsedBody.data.details ?? []) {
            if (detail.message !== undefined) {
                texts.push(detail.message);
            }
        }
    }
    const searchable = texts.join(' ').toLowerCase();
    const providerDetail = texts.length > 0 ? ` Calendly said: ${texts.join(' ')}` : '';

    if (status === 400) {
        if (/(already|exist)/.test(searchable)) {
            return new Error(
                `invitation_conflict: An invitation or organization membership already exists, or a concurrent invitation conflicts.${providerDetail} Check list-organization-invitations and list-organization-memberships for that email before retrying.`
            );
        }
        return new Error(`invalid_request: Calendly rejects the invitation details.${providerDetail} Check the recipient address and organization.`);
    }
    if (status === 401) {
        return new Error(
            `permission_denied: Calendly cannot authenticate the caller.${providerDetail} Ask an organization administrator for access and the required scope.`
        );
    }
    if (status === 403) {
        if (searchable.includes('scim')) {
            return new Error(
                `scim_managed: The organization has SCIM enabled and forbids this invitation action.${providerDetail} Use the organization's identity-management provisioning process.`
            );
        }
        if (searchable.includes('allotted') || searchable.includes('allotment')) {
            return new Error(
                `invitation_limit_reached: Seat-based or trial invitation allotment is exhausted.${providerDetail} Ask the organization administrator to purchase seats or resolve the trial allotment.`
            );
        }
        return new Error(
            `permission_denied: Organization invitation permission or organizations:write is missing.${providerDetail} Ask an organization administrator for access and the required scope.`
        );
    }
    if (status === 404) {
        return new Error(`not_found: The organization is absent.${providerDetail} Obtain its current reference.`);
    }
    if (status === 409) {
        return new Error(
            `invitation_conflict: An invitation or organization membership already exists, or a concurrent invitation conflicts.${providerDetail} Check list-organization-invitations and list-organization-memberships for that email before retrying.`
        );
    }
    if (status === 429) {
        return new Error(`rate_limited: Calendly rate limits the request.${providerDetail} Wait until reset before retrying.`);
    }
    if (status >= 500) {
        return new Error(`provider_error: Calendly reports a server error.${providerDetail} Check invitations for that email before resending.`);
    }
    return new Error(`provider_error: Calendly request failed with status ${status}.${providerDetail} Check invitations for that email before resending.`);
}

/**
 * @tags: [write]
 * @tagReason: Creates an organization invitation, which emails the recipient; no provider reads or deletions.
 * @pitfalls: Creating sends an invitation email, so do not repeat an uncertain send without checking existing invitations first. The call fails if the email already has an invitation or membership in the organization, if the seat-based or trial invitation allotment is exhausted, or when the organization has SCIM enabled (SCIM organizations must use their identity-management workflow). A successful result confirms the invitation record, not email delivery or acceptance.
 */
const tool = createTool({
    name: 'create-organization-invitation',
    description:
        'Invite a person by email to join an organization, returning the invitation record. Organization permission, invitation allotment, and SCIM restrictions apply.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use an organization reference from `list-organization-memberships` or `get-organization` and the recipient email. This sends an invitation; it does not directly add a membership. Check `list-organization-invitations` before repeating an uncertain send. SCIM-enabled organizations must use their identity-management workflow.',
        requiredScopes: ['organizations:write'],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        const organizationUuid = extractOrganizationUuid(input.organizationId);

        let responseData: unknown;
        // @allowTryCatch: Calendly error bodies must be inspected to distinguish SCIM-managed organizations, exhausted invitation allotments, and existing-invitation conflicts, which map to distinct public error codes.
        try {
            // https://developer.calendly.com/api-docs/calendly-api/organizations/create-organization-invitation.md
            const response = await nango.post({
                endpoint: `/organizations/${encodeURIComponent(organizationUuid)}/invitations`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    email: input.email
                },
                retries: 3
            });
            responseData = response.data;
        } catch (error) {
            throw classifyProviderError(error);
        }

        const parsedResponse = CreateInvitationResponseSchema.safeParse(responseData);
        if (!parsedResponse.success) {
            throw new Error(
                'write_result_unknown: The submitted invitation response cannot be interpreted. Check list-organization-invitations before resending.'
            );
        }

        const resource = parsedResponse.data.resource;
        return {
            id: resource.uri,
            organizationId: resource.organization,
            email: resource.email,
            status: resource.status,
            ...(resource.user !== undefined && { userId: resource.user }),
            createdAt: normalizeToUtc(resource.created_at),
            updatedAt: normalizeToUtc(resource.updated_at),
            lastSentAt: resource.last_sent_at === null ? null : normalizeToUtc(resource.last_sent_at)
        };
    }
});

export default tool;
