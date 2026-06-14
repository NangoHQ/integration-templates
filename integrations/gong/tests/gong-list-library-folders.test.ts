import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-library-folders.js';

describe('gong-oauth list-library-folders tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-library-folders',
        Model: 'ActionOutput_gong_oauth_listlibraryfolders'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
