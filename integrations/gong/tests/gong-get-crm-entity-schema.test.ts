import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-crm-entity-schema.js';

describe('gong-oauth get-crm-entity-schema tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-crm-entity-schema',
        Model: 'ActionOutput_gong_oauth_getcrmentityschema'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
