import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-connect-configuration.js';

describe('docusign delete-connect-configuration tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-connect-configuration',
        Model: 'ActionOutput_docusign_deleteconnectconfiguration'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
