import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/remove-lead-from-subsequence.js';

describe('instantly remove-lead-from-subsequence tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'remove-lead-from-subsequence',
        Model: 'ActionOutput_instantly_removeleadfromsubsequence'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
