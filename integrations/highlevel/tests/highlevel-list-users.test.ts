import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-users.js';

describe('highlevel list-users tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-users',
        Model: 'ActionOutput_highlevel_listusers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
