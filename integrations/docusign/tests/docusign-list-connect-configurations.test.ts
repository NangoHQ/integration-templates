import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-connect-configurations.js';

describe('docusign list-connect-configurations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-connect-configurations',
        Model: 'ActionOutput_docusign_listconnectconfigurations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
