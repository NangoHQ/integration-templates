import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-lead-interest-status.js';

describe('instantly update-lead-interest-status tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-lead-interest-status',
        Model: 'ActionOutput_instantly_updateleadintereststatus'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
