import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-lead.js';

describe('microsoft-dataverse delete-lead tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-lead',
        Model: 'ActionOutput_microsoft_dataverse_deletelead'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
