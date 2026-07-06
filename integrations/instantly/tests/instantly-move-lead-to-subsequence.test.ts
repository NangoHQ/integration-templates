import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/move-lead-to-subsequence.js';

describe('instantly move-lead-to-subsequence tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'move-lead-to-subsequence',
        Model: 'ActionOutput_instantly_moveleadtosubsequence'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
