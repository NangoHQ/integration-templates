import { z } from 'zod';
import { createTool } from 'nango';

// Any JSON value; declared via meta so the compiled contract keeps the multi-type form instead of an anyOf.
const isJsonAttributeValue = (value: unknown): boolean => value === null || ['string', 'number', 'boolean', 'object'].includes(typeof value);

const JsonAttributeValueSchema = z.custom(isJsonAttributeValue).meta({ type: ['string', 'number', 'boolean', 'object', 'array', 'null'] });

const InputSchema = z
    .object({
        name: z.string().min(1).describe('Display name for the new Okta-managed group.'),
        description: z
            .string()
            .optional()
            .describe('Group description; omitted means no supplied description, and empty string is an explicitly empty description.'),
        customAttributes: z
            .record(z.string(), JsonAttributeValueSchema)
            .meta({ propertyNames: { not: { enum: ['name', 'description'] } } })
            .optional()
            .describe('Values for existing custom group profile attributes. Keys must not be name or description; omitted means none supplied.')
    })
    .describe('Profile fields for the new Okta-managed group.');

const OutputSchema = z
    .object({
        id: z.string().describe('Opaque ID of the created group in this organization.'),
        type: z.string().describe('Provider group type; a newly created group is OKTA_GROUP.'),
        profile: z
            .object({
                name: z.string().optional().describe('Group display name.'),
                description: z.string().nullable().optional().describe('Group description; null and empty string are preserved, and absence remains omitted.')
            })
            .catchall(JsonAttributeValueSchema)
            .describe('Standard and custom profile attributes returned by Okta; text is not HTML-escaped.'),
        createdAt: z.iso.datetime({ offset: true }).optional().describe('Creation instant in RFC 3339 UTC form; omitted if unavailable.'),
        updatedAt: z.iso.datetime({ offset: true }).optional().describe('Profile update instant in RFC 3339 UTC form; omitted if unavailable.'),
        objectClass: z.array(z.string()).optional().describe('Provider profile-schema class identifiers; omitted if unavailable.'),
        membershipUpdatedAt: z.iso.datetime({ offset: true }).optional().describe('Membership update instant in RFC 3339 UTC form; omitted if unavailable.')
    })
    .describe('The newly created Okta-managed group.');

const OktaGroupSchema = z.object({
    id: z.string(),
    type: z.string(),
    profile: z.record(z.string(), z.unknown()),
    created: z.string().nullable().optional(),
    lastUpdated: z.string().nullable().optional(),
    lastMembershipUpdated: z.string().nullable().optional(),
    objectClass: z.array(z.string()).nullable().optional()
});

const ProxyErrorSchema = z.object({
    response: z
        .object({
            status: z.number().optional(),
            data: z
                .object({
                    errorSummary: z.string().optional()
                })
                .optional()
        })
        .optional()
});

function normalizeToUtc(value: string): string | undefined {
    const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match) {
        return undefined;
    }
    const [, secondsPart, fractionPart, offsetPart] = match;
    if (!secondsPart || !offsetPart) {
        return undefined;
    }
    const offset = offsetPart === 'z' ? 'Z' : offsetPart;
    const ms = Date.parse(`${secondsPart}${offset}`);
    if (Number.isNaN(ms)) {
        return undefined;
    }
    // Shift whole seconds through Date, then re-append the original fraction so sub-millisecond precision survives.
    return `${new Date(ms).toISOString().slice(0, -5)}${fractionPart ?? ''}Z`;
}

function mapOptionalTimestamp(value: string | null | undefined, field: string): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const normalized = normalizeToUtc(value);
    if (normalized === undefined) {
        throw new Error(
            `write_result_unknown: Okta returned a ${field} timestamp that could not be normalized. Use \`list-groups\` to check for the group before creating another.`
        );
    }
    return normalized;
}

/**
 * Creates an Okta-managed group (OKTA_GROUP) and returns the created group.
 *
 * @tags: [write]
 * @tagReason: Creates a new group in Okta; it performs no provider reads or deletes.
 * @pitfalls: No duplicate-name detection is performed, so repeat calls can create multiple groups with the same name; check for an existing group first when uniqueness matters. Custom attributes are rejected unless they already exist in the organization's group profile schema. Returned profile text can contain unescaped HTML and must be escaped before display.
 */
const tool = createTool({
    name: 'create-group',
    description: 'Create an Okta-managed group with a name, description, and optional schema-defined profile attributes.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Use to create an Okta-managed group, not an imported directory group. Use `list-groups` to check for an existing group first when avoiding duplicates matters. The returned ID can be used with `add-user-to-group`, `add-group-owner`, and `create-group-rule`. Custom attributes must already exist in the organization's group profile schema.",
        requiredScopes: ['okta.groups.manage'],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        // Standard attributes always come from the dedicated inputs; custom keys can never override name or description.
        const customProfile: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(input.customAttributes ?? {})) {
            if (key !== 'name' && key !== 'description') {
                customProfile[key] = value;
            }
        }
        const profile = {
            ...customProfile,
            name: input.name,
            ...(input.description !== undefined && { description: input.description })
        };

        const createGroup = async () => {
            // @allowTryCatch: map Okta's documented 400/403/429 create-group failures to the tool's public error codes; anything else is rethrown unchanged.
            try {
                // https://developer.okta.com/docs/api/openapi/okta-management/management/tag/Group/#tag/Group/operation/addGroup
                return await nango.post<unknown>({
                    endpoint: '/api/v1/groups',
                    data: { profile },
                    // Create is not idempotent and Okta supports no idempotency key here, so a retry after a lost response could create a duplicate group.
                    retries: 0
                });
            } catch (error) {
                const parsedError = ProxyErrorSchema.safeParse(error);
                const status = parsedError.success ? parsedError.data.response?.status : undefined;
                const summary = parsedError.success ? parsedError.data.response?.data?.errorSummary : undefined;
                if (status === 400) {
                    throw new Error(
                        `invalid_request: Okta rejected the group name or custom profile values${summary ? ` (${summary})` : ''}. Correct the profile values or ask an administrator to configure the required custom attributes.`
                    );
                }
                if (status === 403) {
                    throw new Error(
                        'forbidden: The connection lacks permission to manage groups. Ask an administrator to grant okta.groups.manage and appropriate group administration authority.'
                    );
                }
                if (status === 429) {
                    throw new Error(
                        "rate_limited: Okta returned Too Many Requests. Wait for the provider's retry guidance before trying again; first use `list-groups` if the create outcome is uncertain."
                    );
                }
                throw error;
            }
        };

        const response = await createGroup();

        const groupParsed = OktaGroupSchema.safeParse(response.data);
        if (!groupParsed.success) {
            throw new Error(
                'write_result_unknown: Okta reported success but the created group could not be read. Use `list-groups` to check for the group before creating another.'
            );
        }
        const group = groupParsed.data;

        const createdAt = mapOptionalTimestamp(group.created, 'created');
        const updatedAt = mapOptionalTimestamp(group.lastUpdated, 'lastUpdated');
        const membershipUpdatedAt = mapOptionalTimestamp(group.lastMembershipUpdated, 'lastMembershipUpdated');

        const outputParsed = OutputSchema.safeParse({
            id: group.id,
            type: group.type,
            profile: group.profile,
            ...(createdAt !== undefined && { createdAt }),
            ...(updatedAt !== undefined && { updatedAt }),
            ...(group.objectClass != null && { objectClass: group.objectClass }),
            ...(membershipUpdatedAt !== undefined && { membershipUpdatedAt })
        });
        if (!outputParsed.success) {
            throw new Error(
                'write_result_unknown: The created group could not be mapped to the expected shape. Use `list-groups` to check for the group before creating another.'
            );
        }
        return outputParsed.data;
    }
});

export default tool;
