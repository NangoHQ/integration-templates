import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-recipient-tabs.js';

describe('docusign list-recipient-tabs tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-recipient-tabs',
        Model: 'ActionOutput_docusign_listrecipienttabs'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
