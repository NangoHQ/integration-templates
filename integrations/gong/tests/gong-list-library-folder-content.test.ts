import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-library-folder-content.js';

describe('gong-oauth list-library-folder-content tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-library-folder-content',
        Model: 'ActionOutput_gong_oauth_listlibraryfoldercontent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
