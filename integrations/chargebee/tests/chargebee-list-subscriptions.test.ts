import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-subscriptions.js';

describe('chargebee list-subscriptions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-subscriptions',
        Model: 'ActionOutput_chargebee_listsubscriptions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
