import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-solution-folder.js';

describe('freshdesk get-solution-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-solution-folder',
        Model: 'ActionOutput_freshdesk_getsolutionfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
