import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-recipient-tabs.js';

describe('docusign create-recipient-tabs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-recipient-tabs',
        Model: 'ActionOutput_docusign_createrecipienttabs'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
