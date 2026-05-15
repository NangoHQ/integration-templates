import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-lead.js';

describe('pipedrive update-lead tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-lead',
        Model: 'ActionOutput_pipedrive_updatelead'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
