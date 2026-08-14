import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-data-request.js';

describe('zoom-cc cancel-data-request tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-data-request',
        Model: 'ActionOutput_zoom_cc_canceldatarequest'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
