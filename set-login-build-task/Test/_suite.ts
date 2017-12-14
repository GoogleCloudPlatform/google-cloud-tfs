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

/**
 * @fileoverview This is a test suite to run test scripts and assert their
 *   outputs for set-login-build-task.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import * as assert from 'assert';
import {
  assertGcloudNotRun,
  assertGcloudSilentSuccess,
  assertKeyFileWritten
} from 'common/asserts';
import * as path from 'path';
import {MockTestRunner} from 'vsts-task-lib/mock-test';

describe('set-login-build-task tests', () => {

  let runner: MockTestRunner;
  beforeEach(() => { runner = null; });

  afterEach(function(): void {
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

    assertGcloudNotRun(runner);
  });

  it('should fail when gcloud fails', () => {
    const testPath = path.join(__dirname, 'gcloud-fails.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    assert.equal(runner.invokedToolCount, 1, 'Should have run gcloud once.');
    assert.equal(runner.warningIssues.length, 0, 'Should have no warnings.');
    assert.equal(runner.errorIssues.length, 1, 'Should have an error.');
    assert(runner.createdErrorIssue('[gcloud error]'),
           'Should write stderr as issue.');
    assert(!runner.stdOutContained('[gcloud output]'),
           'gcloud output should not be visible.');
    assertKeyFileWritten(runner);
    assert(!runner.stdOutContained('[task.setvariable variable=ipVar'),
           'Should not have set ip variable.');
    assert(!runner.stdOutContained('[task.setvariable variable=passwordVar'),
           'Should not have set password variable.');
    assert(!runner.stdOutContained('[task.setvariable variable=userNameVar'),
           'Should not have set user name variable.');
  });

  it('should work with given user name inputs', () => {
    const testPath = path.join(__dirname, 'normal-inputs.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assertGcloudSilentSuccess(runner);
    assert(runner.stdOutContained('[task.setvariable variable=ipVar'),
           'Should have set ip variable.');
    assert(runner.stdOutContained('[task.setvariable variable=passwordVar'),
           'Should have set password variable.');
    assert(!runner.stdOutContained('[task.setvariable variable=userNameVar'),
           'Should not have set user name variable.');
  });

  it('should fail with missing endpoint parameter', () => {
    const testPath = path.join(__dirname, 'missing-endpoint.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assertGcloudNotRun(runner);
    assert(!runner.stdOutContained('[task.setvariable'),
           'Should not have set any variables.');
  });

  it('should fail with missing zone parameter', () => {
    const testPath = path.join(__dirname, 'missing-zone.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assertGcloudNotRun(runner);
    assert(!runner.stdOutContained('[task.setvariable'),
           'Should not have set any variables.');
  });

  it('should fail with missing machine parameter', () => {
    const testPath = path.join(__dirname, 'missing-machine.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assertGcloudNotRun(runner);
    assert(!runner.stdOutContained('[task.setvariable'),
           'Should not have set any variables.');
  });

  it('should fail with missing user name parameter with given ' +
         'userNameType.',
     () => {
       const testPath = path.join(__dirname, 'missing-user-name.js');
       runner = new MockTestRunner(testPath);
       runner.run();

       assertGcloudNotRun(runner);
       assert(!runner.stdOutContained('[task.setvariable'),
              'Should not have set any variables.');
     });

  it('should fail with missing machineIpOutput parameter', () => {
    const testPath = path.join(__dirname, 'missing-machine-ip-output.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assertGcloudNotRun(runner);
    assert(!runner.stdOutContained('[task.setvariable'),
           'Should not have set any variables.');
  });

  it('should fail with missing passwordOutput parameter', () => {
    const testPath = path.join(__dirname, 'missing-password-output.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assertGcloudNotRun(runner);
    assert(!runner.stdOutContained('[task.setvariable'),
           'Should not have set any variables.');
  });

  it('should fail with missing password from gcloud output', () => {
    const testPath = path.join(__dirname, 'gcloud-output-missing-password.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    assert.equal(runner.invokedToolCount, 1, 'Should have run gcloud once.');
    assert.equal(runner.warningIssues.length, 0, 'Should have no warnings.');
    assert.equal(runner.errorIssues.length, 1, 'Should have an error.');
    assertKeyFileWritten(runner);

    assert(runner.createdErrorIssue(
               'Could not find new password for instance instanceId' +
               ' in zone zoneId'),
           'Should not have set ip variable.');
    assert(!runner.stdOutContained('[task.setvariable variable=passwordVar'),
           'Should not have set password variable.');
  });

  it('should fail with missing ip_address from gcloud output', () => {
    const testPath =
        path.join(__dirname, 'gcloud-output-missing-ip_address.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    assert.equal(runner.invokedToolCount, 1, 'Should have run gcloud once.');
    assert.equal(runner.warningIssues.length, 0, 'Should have no warnings.');
    assert.equal(runner.errorIssues.length, 1, 'Should have an error.');
    assertKeyFileWritten(runner);

    assert(runner.createdErrorIssue(
               'Could not find external ip for instance instanceId' +
               ' in zone zoneId'),
           'Should not have set ip variable.');
    assert(!runner.stdOutContained('[task.setvariable variable=ipVar'),
           'Should not have set ip variable.');
  });
});
