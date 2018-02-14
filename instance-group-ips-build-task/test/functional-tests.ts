// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as assert from 'assert';
import {TaskResult} from 'common/task-result';
import * as fs from 'fs';
import * as path from 'path';

import {SetupHelper} from './group-setup-helper';

/**
 * @fileoverview Functional tests that run actual gcloud commands.
 * @author jimwp@google.com (Jim Przybylinski)
 */

const credentialFile =
    path.join('test', 'resources', 'Cloud Tools for TFS Testing.json');

const groupName = 'tfs-test-group';
const zoneName = 'us-central1-b';

const describeWithCredentialFile =
    fs.existsSync(credentialFile) ? describe : describe.skip;

describeWithCredentialFile('functional tests', function(): void {
  this.timeout(0);
  let taskOutput: TaskResult;
  let env: {[variableName: string]: string};

  let setupHelper: SetupHelper;
  let endpointAuth: string;

  before(async () => {
    endpointAuth = JSON.stringify({
      parameters : {certificate : fs.readFileSync(credentialFile).toString()},
    });
    setupHelper = new SetupHelper(groupName, zoneName, credentialFile);
    try {
      await setupHelper.findOrSetupTestGroupAsync();
    } catch (e) {
      console.error(e);
      for (const output of setupHelper.output) {
        console.log(`----- ${output.task}-----`);
        console.log(output.stdout);
        console.error(output.stderr);
      }
    }
  });

  beforeEach(async () => {
    taskOutput = undefined;
    env = {
      ['INPUT_serviceEndpoint'] : 'endpoint',
      ['ENDPOINT_AUTH_endpoint'] : endpointAuth,
      ['INPUT_locationScope'] : 'zone',
      ['INPUT_zone'] : 'us-central1-a',
      ['INPUT_instanceGroupName'] : 'default-test-group',
      ['INPUT_buildVariableName'] : 'test.variable',
    };
  });

  afterEach('write task output on failure', async function(): Promise<void> {
    if (this.currentTest.state === 'failed') {
      if (taskOutput) {
        taskOutput.logData();
      }
    }
  });

  const requiredParameters = [
    'locationScope',
    'instanceGroupName',
    'buildVariableName',
    'serviceEndpoint',
  ];

  for (const input of requiredParameters) {
    it(`should fail with missing required input ${input}`, async () => {
      env[`INPUT_${input}`] = undefined;

      taskOutput = await TaskResult.runTask('run.js', env);

      assert.equal(taskOutput.getStatus()[0], 'failed');
    });
  }

  it('should fail for invalid scope', async () => {
    env['INPUT_locationScope'] = 'invalid';

    taskOutput = await TaskResult.runTask('run.js', env);

    assert.equal(taskOutput.getStatus()[0], 'failed');
  });

  it('should fail with missing region input given region scope', async () => {
    env['INPUT_locationScope'] = 'region';
    env['INPUT_region'] = undefined;

    taskOutput = await TaskResult.runTask('run.js', env);

    assert.equal(taskOutput.getStatus()[0], 'failed');
  });

  it('should fail with missing zone input given zone scope', async () => {
    env['INPUT_locationScope'] = 'zone';
    env['INPUT_zone'] = undefined;

    taskOutput = await TaskResult.runTask('run.js', env);

    assert.equal(taskOutput.getStatus()[0], 'failed');
  });

  it('should succeed, returning two ips', async () => {
    const variableName = 'build.variable';
    env['INPUT_zone'] = zoneName;
    env['INPUT_instanceGroupName'] = groupName;
    env['INPUT_buildVariableName'] = variableName;
    env['INPUT_separator'] = ';';

    taskOutput = await TaskResult.runTask('run.js', env);

    assert.equal(taskOutput.getStatus()[0], 'succeeded');
    const variableValue = taskOutput.getVariable(variableName, false);
    assert(variableValue);
    const ips = variableValue.split(';');
    assert.equal(ips.length, 2);
    for (const ip of ips) {
      assert(ip.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/));
    }
  });
});
