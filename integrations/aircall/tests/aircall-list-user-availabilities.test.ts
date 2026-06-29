import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-availabilities.js';

describe('aircall list-user-availabilities tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-user-availabilities',
        Model: 'ActionOutput_aircall_basic_listuseravailabilities'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
