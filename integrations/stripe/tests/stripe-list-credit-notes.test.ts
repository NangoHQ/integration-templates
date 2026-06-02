import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-credit-notes.js';

describe('stripe list-credit-notes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-credit-notes',
        Model: 'ActionOutput_stripe_listcreditnotes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
