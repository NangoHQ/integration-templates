import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-integrations.js';

describe('connectsecure list-integrations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-integrations',
        Model: 'ActionOutput_connectsecure_listintegrations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
