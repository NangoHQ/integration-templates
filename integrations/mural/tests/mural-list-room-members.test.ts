import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-room-members.js';

describe('mural list-room-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-room-members',
        Model: 'ActionOutput_mural_listroommembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
