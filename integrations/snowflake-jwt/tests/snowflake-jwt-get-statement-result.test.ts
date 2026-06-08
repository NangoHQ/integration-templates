import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-statement-result.js';

describe('snowflake-jwt get-statement-result tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-statement-result',
        Model: 'ActionOutput_snowflake_jwt_getstatementresult'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
