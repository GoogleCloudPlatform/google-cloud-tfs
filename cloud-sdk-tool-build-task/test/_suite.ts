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
import * as gcloudAssert from 'common/asserts';
import * as path from 'path';
import {MockTestRunner} from 'vsts-task-lib/mock-test';

describe('cloud-sdk-tool', function() {

  let runner: MockTestRunner;
  beforeEach(function() { runner = null; });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      console.log(runner.stdout);
      console.log('--------------------');
      console.log(runner.stderr);
    }
  });

  it('should fail for no gcloud', () => {
    const testPath = path.join(__dirname, 'no-gcloud.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
  });
});
