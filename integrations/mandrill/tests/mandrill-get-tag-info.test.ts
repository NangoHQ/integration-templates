import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-tag-info.js';

describe('mandrill get-tag-info tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-tag-info',
        Model: 'ActionOutput_mandrill_gettaginfo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
