import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        policyName: z.string().min(1).describe('Exact target policy name.'),
        configuration: z
            .union([
                z
                    .object({
                        inheritsFromBase: z.literal(true).describe('Discard local custom entries and default overrides and inherit URL bypass from Base.')
                    })
                    .describe('Reset the policy URL bypass configuration to Base Policy inheritance.'),
                z
                    .object({
                        defaults: z
                            .array(
                                z
                                    .object({
                                        name: z
                                            .string()
                                            .min(1)
                                            .describe('Exact provider-default URL entry name from get-url-bypass; unknown names are ignored.'),
                                        state: z.enum(['applied', 'ignored']).describe('Apply the default bypass entry or suppress it.')
                                    })
                                    .describe('One provider-default URL bypass entry state change.')
                            )
                            .min(1)
                            .max(100)
                            .describe('Default URL bypass states to change; use exact names, unique within the call.')
                    })
                    .describe('Change the toggle states of provider-default URL bypass entries.')
            ])
            .describe('Choose either Base inheritance reset or selected default state changes.')
    })
    .describe('URL bypass configuration write for one policy: either reset to Base Policy inheritance or change provider-default entry states.');

const OutputSchema = z
    .object({
        message: z.string().describe('Aggregate provider acknowledgment; unknown default names may have been ignored.'),
        policyName: z.string().describe('Policy whose configuration request was acknowledged.')
    })
    .describe('Aggregate provider acknowledgment of the URL bypass configuration request.');

const ProviderSuccessSchema = z.object({
    message: z.string()
});

const ProviderErrorBodySchema = z.object({
    errors: z.array(z.looseObject({ message: z.string() })).min(1)
});

const ProviderHttpErrorSchema = z.looseObject({
    response: z.looseObject({
        status: z.number(),
        data: z.unknown()
    })
});

/**
 * @tags: [write, destructive]
 * @tagReason: Mutates the target policy's URL bypass configuration; the inheritance reset irreversibly discards all local custom entries and default overrides, and writing default states on an inherited policy detaches it from Base.
 * @pitfalls: Resetting to Base inheritance irreversibly drops all local custom URL patterns and default overrides. Changing default states on an inherited policy detaches its whole URL bypass configuration from Base without copying Base entries, so later Base Policy changes stop propagating to it. The acknowledgment is aggregate: unknown default names are silently ignored even on success.
 */
const tool = createTool({
    name: 'update-url-bypass',
    description: 'Reset URL bypass to Base Policy inheritance, or change provider-default URL bypass states.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Inspect `get-url-bypass` for inheritance and exact default names. Inheritance reset discards all local custom patterns and default overrides. Changing defaults on an inherited policy detaches the whole URL bypass configuration without copying Base entries. Unknown defaults are silently ignored. Use custom-entry upsert tools for custom patterns. Maximum 100 default changes.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let data: { inheritsFromBase: true } | { default: { name: string; state: 'applied' | 'ignored' }[] };
        if ('inheritsFromBase' in input.configuration) {
            data = { inheritsFromBase: true };
        } else {
            const seen = new Set<string>();
            for (const entry of input.configuration.defaults) {
                if (seen.has(entry.name)) {
                    throw new Error(
                        `duplicate_key: The default changes contain the name '${entry.name}' more than once. Keep one state per default entry name.`
                    );
                }
                seen.add(entry.name);
            }
            data = { default: input.configuration.defaults };
        }

        let responseData: unknown;
        // @allowTryCatch: Provider 400 and 500 responses must be mapped to the tool's public error codes; any other failure is re-thrown unchanged.
        try {
            // https://4250118259-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2Fqdf21diS0j19gSMF9LeP%2Fuploads%2F6XuU5t4y5DDhEPVZ9Rrg%2FopenAPI%20v%201_13.yaml?alt=media&token=819a185e-ab25-423a-a3d2-c624ef545bc0#PUT /policies/{policy_name}/bypass/urls
            const response = await nango.put({
                endpoint: `/policies/${encodeURIComponent(input.policyName)}/bypass/urls`,
                data: { data },
                // A retry after a lost response would repeat this write with uncertain audit effects, so the PUT is not retried.
                retries: 0
            });
            responseData = response.data;
        } catch (error) {
            const httpError = ProviderHttpErrorSchema.safeParse(error);
            if (httpError.success) {
                const providerBody = ProviderErrorBodySchema.safeParse(httpError.data.response.data);
                const firstMessage = providerBody.success ? providerBody.data.errors[0]?.message : undefined;
                const detail = firstMessage ? ` Provider error: ${firstMessage}` : '';
                if (httpError.data.response.status === 400) {
                    throw new Error(
                        `bad_request: The provider rejected the policy or configuration.${detail} Check list-policies and get-url-bypass; do not request Base Policy self-inheritance.`
                    );
                }
                if (httpError.data.response.status === 500) {
                    throw new Error(
                        `internal_error: The provider reported an internal error and effects may be uncertain.${detail} Read get-url-bypass before retrying.`
                    );
                }
            }
            throw error;
        }

        const acknowledgment = ProviderSuccessSchema.safeParse(responseData);
        if (!acknowledgment.success) {
            throw new Error(
                'write_result_unknown: The provider acknowledgment could not be interpreted. Read get-url-bypass to inspect actual inheritance and toggle states.'
            );
        }

        return { message: acknowledgment.data.message, policyName: input.policyName };
    }
});

export default tool;
