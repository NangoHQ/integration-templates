import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-solution-folder.js';

describe('freshdesk create-solution-folder tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-solution-folder',
        Model: 'ActionOutput_freshdesk_createsolutionfolder'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
