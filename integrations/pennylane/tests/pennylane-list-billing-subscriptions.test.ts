import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-billing-subscriptions.js';

describe('pennylane list-billing-subscriptions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-billing-subscriptions',
        Model: 'ActionOutput_pennylane_listbillingsubscriptions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
