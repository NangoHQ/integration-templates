import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-stage.js';

describe('pipedrive delete-stage tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-stage',
        Model: 'ActionOutput_pipedrive_deletestage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
