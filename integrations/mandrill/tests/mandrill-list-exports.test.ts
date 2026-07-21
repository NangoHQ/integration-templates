import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-exports.js';

describe('mandrill list-exports tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-exports',
        Model: 'ActionOutput_mandrill_listexports'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
