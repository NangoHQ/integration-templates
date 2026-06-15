import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-flow-folders.js';

describe('gong-oauth list-flow-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-flow-folders',
        Model: 'ActionOutput_gong_oauth_listflowfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
