import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-account-fixed.js';

describe('instantly mark-account-fixed tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-account-fixed',
        Model: 'ActionOutput_instantly_markaccountfixed'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
