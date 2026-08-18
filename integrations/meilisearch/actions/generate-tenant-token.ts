import { z } from 'zod';
import { createAction } from 'nango';

import { searchRulesSchema } from '../helpers/schemas.js';
import { generateTenantToken } from '../helpers/tenant-token.js';

import type { ProxyConfiguration } from 'nango';

const DEFAULT_TTL_SECONDS = 3600;
const KEYS_PAGE_SIZE = 100;

const InputSchema = z.object({
    searchRules: searchRulesSchema.describe('Per-index search rules (the ACL carried by the token), keyed by index uid or "*".'),
    expiresAt: z.number().optional().describe('Expiry as epoch seconds. Takes precedence over expiresInSeconds.'),
    expiresInSeconds: z.number().optional().describe('Expiry as a duration from now. Defaults to 3600 (1 hour) when neither field is set.'),
    apiKeyUid: z
        .string()
        .optional()
        .describe(
            "Uid of the connection's API key. Must match the key used by this connection or Meilisearch will reject the token. When omitted, it is resolved by listing keys, which requires the keys.get action."
        )
});

const OutputSchema = z.object({
    token: z.string(),
    expiresAt: z.number()
});

const KeysPageSchema = z
    .object({
        results: z.array(z.object({ key: z.string(), uid: z.string() }).catchall(z.unknown())),
        total: z.number()
    })
    .catchall(z.unknown());

const action = createAction({
    description:
        'Generate a Meilisearch tenant token: a scoped, signed search JWT carrying per-index ACL rules. Expires after 1 hour unless expiresAt or expiresInSeconds is set.',
    version: '1.0.0',
    scopes: ['keys.get'],

    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: InputSchema, input });

        const searchRules = parsedInput.data.searchRules;
        if (Object.keys(searchRules).length === 0) {
            throw new nango.ActionError({ message: 'searchRules must define at least one index rule.' });
        }

        const credentials = await nango.getToken();
        if (typeof credentials === 'string' || !('apiKey' in credentials)) {
            throw new nango.ActionError({ message: 'Meilisearch connection must use API_KEY auth to mint tenant tokens.' });
        }
        const apiKey = credentials.apiKey;

        let apiKeyUid = parsedInput.data.apiKeyUid;
        if (!apiKeyUid) {
            // Resolve the key's uid by listing keys and matching locally: GET /keys/{key}
            // would put the raw key in the URL path, which proxy/access logs record unredacted.
            // @allowTryCatch rethrown with an actionable message: the common cause is a key without the keys.get action.
            try {
                let offset = 0;
                let total = Number.POSITIVE_INFINITY;
                while (!apiKeyUid && offset < total) {
                    const config: ProxyConfiguration = {
                        // https://www.meilisearch.com/docs/reference/api/keys#get-all-keys
                        endpoint: '/keys',
                        params: { limit: String(KEYS_PAGE_SIZE), offset: String(offset) },
                        retries: 3
                    };
                    const response = await nango.get(config);
                    const keysPage = KeysPageSchema.parse(response.data);
                    apiKeyUid = keysPage.results.find((k) => k.key === apiKey)?.uid;
                    total = keysPage.total;
                    offset += KEYS_PAGE_SIZE;
                }
            } catch (err) {
                // Rethrown with an actionable message; the underlying error is preserved for debugging.
                const cause = err instanceof Error ? err.message : String(err);
                throw new nango.ActionError({
                    message: `Could not list keys to resolve the API key uid (${cause}). Listing keys requires a key with the keys.get action. Either connect with a key that has keys.get, or pass apiKeyUid explicitly.`
                });
            }
            if (!apiKeyUid) {
                throw new nango.ActionError({
                    message:
                        'The connection API key was not found among the instance keys (the master key cannot sign tenant tokens). Connect with a regular API key, or pass apiKeyUid explicitly.'
                });
            }
        }

        const nowSeconds = Math.floor(Date.now() / 1000);
        const expiresAt = parsedInput.data.expiresAt ?? nowSeconds + (parsedInput.data.expiresInSeconds ?? DEFAULT_TTL_SECONDS);

        const token = generateTenantToken({
            apiKey,
            apiKeyUid,
            searchRules,
            expiresAt
        });

        return { token, expiresAt };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
