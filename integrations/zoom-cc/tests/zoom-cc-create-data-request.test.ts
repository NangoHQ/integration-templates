import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-data-request.js';

describe('zoom-cc create-data-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-data-request',
        Model: 'ActionOutput_zoom_cc_createdatarequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
