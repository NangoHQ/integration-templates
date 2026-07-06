import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-archive-reason.js';

describe('lever-basic get-archive-reason tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-archive-reason',
        Model: 'ActionOutput_lever_basic_getarchivereason'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
