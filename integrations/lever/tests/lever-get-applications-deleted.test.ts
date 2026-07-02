import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-applications-deleted.js';

describe('lever-basic get-applications-deleted tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-applications-deleted',
        Model: 'ActionOutput_lever_basic_getapplicationsdeleted'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
