import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-order.js';

describe('paypal create-order experience_context tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-order-experience-context',
        Model: 'ActionOutput_paypal_sandbox_createorder'
    });

    it('should reject experience_context combined with a non-paypal payment_source', async () => {
        const input = await nangoMock.getInput();
        try {
            await createAction.exec(nangoMock, input);
            expect.fail('Expected action to throw');
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null) {
                expect((err as { payload?: { type?: string } }).payload).toMatchObject({
                    type: 'invalid_input'
                });
            } else {
                expect.fail('Expected error to be an object');
            }
        }
    });

    it('should merge experience_context under payment_source.paypal without dropping other paypal fields', async () => {
        const postMock = vi.fn().mockResolvedValue({
            data: { id: '1PK41136108556627', status: 'CREATED' }
        });
        const fakeNango = {
            post: postMock,
            ActionError: class ActionError extends Error {}
        } as unknown as Parameters<(typeof createAction)['exec']>[0];

        const input = {
            intent: 'CAPTURE' as const,
            purchase_units: [{ amount: { currency_code: 'USD', value: '10.00' } }],
            payment_source: { paypal: { vault_id: 'existing-vault-id' } },
            experience_context: { return_url: 'https://example.com/return' }
        };

        await createAction.exec(fakeNango, input);

        expect(postMock).toHaveBeenCalledTimes(1);
        const requestData = postMock.mock.calls[0][0].data as Record<string, unknown>;
        expect(requestData['payment_source']).toEqual({
            paypal: {
                vault_id: 'existing-vault-id',
                experience_context: { return_url: 'https://example.com/return' }
            }
        });
    });
});
