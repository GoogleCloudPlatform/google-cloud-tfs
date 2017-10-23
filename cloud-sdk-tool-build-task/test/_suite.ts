// Copyright 2017 Google Inc. All Rights Reserved
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

/**
 * @fileoverview This is a test suite that tests the cloud-sdk-tool task.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import 'mocha';

import * as assert from 'assert';
import * as path from 'path';
import {MockTestRunner} from 'vsts-task-lib/mock-test';

import {CloudSdkPackage} from '../cloud-sdk-package';

describe('cloud-sdk-tool', function() {
  this.timeout(0);

  let runner: MockTestRunner;
  beforeEach(function() { runner = null; });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      console.log(runner.stdout);
      console.log('--------------------');
      console.log(runner.stderr);
    }
  });

  it('fails installing kubectl', async () => {
    process.env['Agent_Version'] = '2.115.0';
    process.env['Agent_TempDirectory'] =
        path.join(process.env['TEMP'], 'TfsTemp');
    process.env['Agent_ToolsDirectory'] =
      path.join(process.env['TEMP'], 'TfsTools');
    await new CloudSdkPackage('176.0.0').aquire(true);
  });
});
