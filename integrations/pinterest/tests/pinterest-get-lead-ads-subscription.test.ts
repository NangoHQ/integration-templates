import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-lead-ads-subscription.js';

describe('pinterest get-lead-ads-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-lead-ads-subscription',
        Model: 'ActionOutput_pinterest_getleadadssubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
