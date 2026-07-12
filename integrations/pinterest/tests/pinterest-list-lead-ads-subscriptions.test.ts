import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-lead-ads-subscriptions.js';

describe('pinterest list-lead-ads-subscriptions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-lead-ads-subscriptions',
        Model: 'ActionOutput_pinterest_listleadadssubscriptions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
