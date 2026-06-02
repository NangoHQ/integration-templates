import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-api-keys.js';

describe('algolia list-api-keys tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-api-keys',
        Model: 'ActionOutput_algolia_listapikeys'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
