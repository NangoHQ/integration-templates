import { z } from 'zod';
import { createTool } from 'nango';
import type { HttpResponse } from 'nango';

const InputSchema = z
    .object({
        name: z.string().min(1).describe('Unique enterprise policy name, as ordinary text.'),
        policyType: z.enum(['finite', 'indefinite']).describe('Finite requires retentionDays; indefinite forbids it.'),
        description: z.string().max(500).optional().describe('Optional policy explanation; empty string means no explanation.'),
        notifyOwners: z.boolean().optional().describe("Notify owners and co-owners near expiration; omission uses Box's default."),
        retentionDays: z.number().int().min(1).max(2147483647).optional().describe('Finite retention duration in days.'),
        retentionType: z.enum(['modifiable', 'non_modifiable']).optional().describe("Modification restrictions; omission uses Box's default."),
        maxExtensionDays: z
            .number()
            .int()
            .min(1)
            .max(2147483647)
            .nullable()
            .optional()
            .describe('Maximum extension in days; null disables extension; only valid for finite permanent-delete policies.'),
        dispositionAction: z
            .enum(['permanently_delete', 'remove_retention'])
            .describe('Whether expiration permanently deletes content or only lifts retention.'),
        allowOwnerExtension: z.boolean().optional().describe("Allow owners to extend retention; omission uses Box's default."),
        notificationRecipientUserIds: z
            .array(z.string().min(1))
            .meta({ uniqueItems: true })
            .optional()
            .describe('Additional user IDs to notify; empty array specifies no additional recipients.')
    })
    .superRefine((value, ctx) => {
        if (value.policyType === 'finite' && value.retentionDays === undefined) {
            ctx.addIssue({ code: 'custom', path: ['retentionDays'], message: 'retentionDays is required when policyType is "finite".' });
        }
        if (value.policyType === 'indefinite' && value.retentionDays !== undefined) {
            ctx.addIssue({ code: 'custom', path: ['retentionDays'], message: 'retentionDays must be omitted when policyType is "indefinite".' });
        }
        if (value.maxExtensionDays !== undefined && (value.policyType !== 'finite' || value.dispositionAction !== 'permanently_delete')) {
            ctx.addIssue({
                code: 'custom',
                path: ['maxExtensionDays'],
                message: 'maxExtensionDays is only valid for finite policies whose dispositionAction is "permanently_delete".'
            });
        }
        if (
            value.notificationRecipientUserIds !== undefined &&
            new Set(value.notificationRecipientUserIds).size !== value.notificationRecipientUserIds.length
        ) {
            ctx.addIssue({ code: 'custom', path: ['notificationRecipientUserIds'], message: 'notificationRecipientUserIds must not contain duplicates.' });
        }
    })
    .meta({
        allOf: [
            {
                if: { properties: { policyType: { const: 'finite' } } },
                else: { not: { required: ['retentionDays'] } },
                then: { required: ['retentionDays'] }
            },
            {
                if: { required: ['maxExtensionDays'] },
                then: { properties: { policyType: { const: 'finite' }, dispositionAction: { const: 'permanently_delete' } } }
            }
        ]
    })
    .describe(
        'Settings for the new enterprise retention policy: a finite policy requires retentionDays, and maxExtensionDays (including null) applies only to finite policies that permanently delete.'
    );

const OutputSchema = z
    .object({
        id: z.string().describe('ID of the created policy; creation does not assign it.'),
        name: z.string().optional().describe('Created policy name as returned by Box.'),
        status: z.enum(['active', 'retired']).optional().describe('Lifecycle state of the created policy, when returned.')
    })
    .describe('Provider-confirmed identity of the created, still unassigned retention policy.');

interface RetentionPolicyCreateBody {
    policy_name: string;
    policy_type: 'finite' | 'indefinite';
    disposition_action: 'permanently_delete' | 'remove_retention';
    description?: string;
    retention_length?: string;
    retention_type?: 'modifiable' | 'non_modifiable';
    max_extension_length?: string;
    are_owners_notified?: boolean;
    can_owner_extend_retention?: boolean;
    custom_notification_recipients?: { type: 'user'; id: string }[];
}

const ProviderRetentionPolicySchema = z.object({
    id: z.string(),
    policy_name: z.string().optional(),
    status: z.enum(['active', 'retired']).optional()
});

const ErrorStatusSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

const ErrorMessageSchema = z.object({
    response: z.object({
        data: z.object({
            message: z.string()
        })
    })
});

/**
 * @tags: [write]
 * @tagReason: Creates a new retention policy in Box, a provider-side mutation; it reads nothing and deletes nothing.
 * @pitfalls: This Box endpoint is not available on the Free Developer Plan. The policy is created unassigned, and a permanently_delete policy irreversibly deletes retained content once it is assigned and expires. A duplicate policy name fails with a conflict, so retrying an uncertain creation can error even when the first attempt succeeded.
 */
const tool = createTool({
    name: 'create-retention-policy',
    description:
        'Create an enterprise retention policy with explicit expiration disposition and optional owner notifications. Requires retention administration authority.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Choose duration and disposition carefully: permanently_delete causes permanent content deletion after retention expires. Creation does not assign the policy; use `create-retention-policy-assignment` afterward. Use `list-retention-policies` to check existing names before retrying an uncertain creation.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        const data: RetentionPolicyCreateBody = {
            policy_name: input.name,
            policy_type: input.policyType,
            disposition_action: input.dispositionAction,
            ...(input.description !== undefined && { description: input.description }),
            ...(input.retentionType !== undefined && { retention_type: input.retentionType }),
            ...(input.maxExtensionDays !== undefined && {
                max_extension_length: input.maxExtensionDays === null ? 'none' : input.maxExtensionDays.toString(10)
            }),
            ...(input.notifyOwners !== undefined && { are_owners_notified: input.notifyOwners }),
            ...(input.allowOwnerExtension !== undefined && { can_owner_extend_retention: input.allowOwnerExtension }),
            ...(input.notificationRecipientUserIds !== undefined && {
                custom_notification_recipients: input.notificationRecipientUserIds.map((userId): { type: 'user'; id: string } => ({ type: 'user', id: userId }))
            })
        };

        let response: HttpResponse<unknown>;
        // @allowTryCatch: Box client errors are remapped to this tool's public error codes; anything without an HTTP status is rethrown unchanged.
        try {
            // https://developer.box.com/reference/post-retention-policies/
            response = await nango.post({
                endpoint: '/2.0/retention_policies',
                data,
                ...(input.policyType === 'finite' && input.retentionDays !== undefined && { params: { retention_length: input.retentionDays.toString(10) } }),
                // Creation is not idempotent: a retry after a lost response could create a duplicate policy.
                retries: 0
            });
        } catch (err) {
            const statusParse = ErrorStatusSchema.safeParse(err);
            if (!statusParse.success) {
                throw err;
            }
            const status = statusParse.data.response.status;
            const messageParse = ErrorMessageSchema.safeParse(err);
            const detail = messageParse.success ? ` Box: ${messageParse.data.response.data.message}` : '';
            if (status === 403) {
                throw new Error(
                    `permission_denied: The user cannot create retention policies. Ask an administrator for retention management authority.${detail}`
                );
            }
            if (status === 409) {
                throw new Error(
                    `conflict: A retention policy with this name already exists. Find it using list-retention-policies, or choose another name.${detail}`
                );
            }
            if (status === 400) {
                throw new Error(
                    `invalid_policy: Box rejected a policy setting or combination. Review the provider details and correct the policy settings.${detail}`
                );
            }
            throw new Error(
                `provider_error: Box reported an unexpected client error (status ${status}). Inspect existing policies before retrying an uncertain creation.${detail}`
            );
        }

        const parsed = ProviderRetentionPolicySchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(
                'write_result_unknown: Box returned a success response that could not be mapped. Check list-retention-policies for the name before retrying.'
            );
        }

        return {
            id: parsed.data.id,
            ...(parsed.data.policy_name !== undefined && { name: parsed.data.policy_name }),
            ...(parsed.data.status !== undefined && { status: parsed.data.status })
        };
    }
});

export default tool;
