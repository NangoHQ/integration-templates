import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-update.js';

describe('monday get-update tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-update',
        Model: 'ActionOutput_monday_getupdate'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
