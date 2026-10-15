import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-workspace-rooms.js';

describe('mural list-workspace-rooms tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-workspace-rooms',
        Model: 'ActionOutput_mural_listworkspacerooms'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
