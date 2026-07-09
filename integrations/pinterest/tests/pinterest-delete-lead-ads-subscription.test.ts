import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-lead-ads-subscription.js';

describe('pinterest delete-lead-ads-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-lead-ads-subscription',
        Model: 'ActionOutput_pinterest_deleteleadadssubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
