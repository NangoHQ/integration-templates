import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/upload-crm-entity-schema.js';

describe('gong-oauth upload-crm-entity-schema tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upload-crm-entity-schema',
        Model: 'ActionOutput_gong_oauth_uploadcrmentityschema'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
