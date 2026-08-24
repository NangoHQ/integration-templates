import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-solution-folder.js';

describe('freshdesk delete-solution-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-solution-folder',
        Model: 'ActionOutput_freshdesk_deletesolutionfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
