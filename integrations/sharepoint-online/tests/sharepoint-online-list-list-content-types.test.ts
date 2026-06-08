import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-list-content-types.js';

describe('sharepoint-online list-list-content-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-list-content-types',
        Model: 'ActionOutput_sharepoint_online_listlistcontenttypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
