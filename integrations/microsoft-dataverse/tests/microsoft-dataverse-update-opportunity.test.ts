import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-opportunity.js';

describe('microsoft-dataverse update-opportunity tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-opportunity',
        Model: 'ActionOutput_microsoft_dataverse_updateopportunity'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
