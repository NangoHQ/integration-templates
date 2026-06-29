import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/attach-file-invoice.js';

describe('exact-online attach-file-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'attach-file-invoice',
        Model: 'ActionOutput_exact_online_attachfileinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
