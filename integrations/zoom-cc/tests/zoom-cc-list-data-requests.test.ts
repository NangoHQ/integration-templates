import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-data-requests.js';

describe('zoom-cc list-data-requests tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-data-requests',
        Model: 'ActionOutput_zoom_cc_listdatarequests'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
