import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-lead-full-status.js';

describe('lemlist get-lead-full-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-lead-full-status',
        Model: 'ActionOutput_lemlist_getleadfullstatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
