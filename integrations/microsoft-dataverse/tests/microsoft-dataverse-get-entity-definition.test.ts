import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-entity-definition.js';

describe('microsoft-dataverse get-entity-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-entity-definition',
        Model: 'ActionOutput_microsoft_dataverse_getentitydefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
