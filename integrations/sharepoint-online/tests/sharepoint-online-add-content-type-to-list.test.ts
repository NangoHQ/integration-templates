import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-content-type-to-list.js';

describe('sharepoint-online add-content-type-to-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-content-type-to-list',
        Model: 'ActionOutput_sharepoint_online_addcontenttypetolist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
