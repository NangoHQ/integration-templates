import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-mural-members.js';

describe('mural list-mural-members tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-mural-members',
        Model: 'ActionOutput_mural_listmuralmembers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
