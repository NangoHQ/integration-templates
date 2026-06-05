import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/execute-statement.js';

describe('snowflake-jwt execute-statement tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'execute-statement',
        Model: 'ActionOutput_snowflake_jwt_executestatement'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
