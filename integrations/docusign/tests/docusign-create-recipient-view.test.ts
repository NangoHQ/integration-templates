import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-recipient-view.js';

describe('docusign create-recipient-view tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-recipient-view',
        Model: 'ActionOutput_docusign_createrecipientview'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
