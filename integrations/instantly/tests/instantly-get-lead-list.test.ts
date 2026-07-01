import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-lead-list.js';

describe('instantly get-lead-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-lead-list',
        Model: 'ActionOutput_instantly_getleadlist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
