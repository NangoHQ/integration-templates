import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-lead-ads-subscription.js';

describe('pinterest create-lead-ads-subscription tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-lead-ads-subscription',
        Model: 'ActionOutput_pinterest_createleadadssubscription'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
