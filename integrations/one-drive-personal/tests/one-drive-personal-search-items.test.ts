import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-items.js';

describe('one-drive-personal search-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-items',
        Model: 'ActionOutput_one_drive_personal_searchitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
