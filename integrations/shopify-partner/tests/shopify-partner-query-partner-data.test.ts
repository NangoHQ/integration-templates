import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/query-partner-data.js';

describe('shopify-partner query-partner-data tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'query-partner-data',
        Model: 'ActionOutput_shopify_partner_querypartnerdata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should reject a plain mutation', async () => {
        await expect(
            createAction.exec(nangoMock, { query: 'mutation { appSubscriptionCancel(id: "gid://partners/AppSubscription/1") { userErrors { message } } }' })
        ).rejects.toMatchObject({
            payload: { type: 'mutation_not_allowed' }
        });
    });

    it('should reject a mutation hidden behind a leading fragment', async () => {
        // Regression test: a naive "does the trimmed string start with mutation" check would
        // miss this, letting a write operation slip past the read-only guard.
        await expect(
            createAction.exec(nangoMock, {
                query: 'fragment F on AppSubscription { id }\nmutation { appSubscriptionCancel(id: "gid://partners/AppSubscription/1") { userErrors { message } } }'
            })
        ).rejects.toMatchObject({ payload: { type: 'mutation_not_allowed' } });
    });

    it('should reject a subscription operation', async () => {
        await expect(createAction.exec(nangoMock, { query: 'subscription { appEvents { id } }' })).rejects.toMatchObject({
            payload: { type: 'mutation_not_allowed' }
        });
    });

    it('should throw a descriptive error for an unparseable query instead of crashing', async () => {
        await expect(createAction.exec(nangoMock, { query: 'not a graphql document at all !!!' })).rejects.toMatchObject({
            payload: { type: 'invalid_query' }
        });
    });
});
