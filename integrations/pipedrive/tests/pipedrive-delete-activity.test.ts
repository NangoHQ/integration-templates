import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-activity.js';

describe('pipedrive delete-activity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-activity',
        Model: 'ActionOutput_pipedrive_deleteactivity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
