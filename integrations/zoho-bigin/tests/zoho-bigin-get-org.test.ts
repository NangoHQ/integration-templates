import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-org.js';

describe('zoho-bigin get-org tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-org',
        Model: 'ActionOutput_zoho_bigin_getorg'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
