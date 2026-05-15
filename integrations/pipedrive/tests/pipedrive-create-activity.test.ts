import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-activity.js';

describe('pipedrive create-activity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-activity',
        Model: 'ActionOutput_pipedrive_createactivity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
