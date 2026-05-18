import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-person.js';

describe('pipedrive get-person tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-person',
        Model: 'ActionOutput_pipedrive_getperson'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
