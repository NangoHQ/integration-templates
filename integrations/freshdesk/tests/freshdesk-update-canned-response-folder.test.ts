import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-canned-response-folder.js';

describe('freshdesk update-canned-response-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-canned-response-folder',
        Model: 'ActionOutput_freshdesk_updatecannedresponsefolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
