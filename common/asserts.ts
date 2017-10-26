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
 * @fileoverview This is a common set of asserts used in test suites.
 * @author JimWP@google.com (Jim Przybylinski)
 */
import * as assert from 'assert';
import {MockTestRunner} from 'vsts-task-lib/mock-test';

import * as mock from './register-mocks';
import * as s from './strings';

/**
 * Tests that the test run successfully with no warnings or errors, and that
 * the key file was written and deleted.
 * @param runner The test runner to assert against.
 */
export function assertRunSuccess(runner: MockTestRunner): void {
  assert(runner.succeeded, 'Should have succeeded.');
  assert.equal(runner.warningIssues.length, 0, 'Should have no warnings.');
  assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
  assertKeyFileWritten(runner);
}

/**
 * Interface for options to assertGcloudSuccess()
 */
export interface SuccessOption {
  invokeCount?: number;
  gcloudOutput?: string;
}

/**
 * Asserts run success with gcloud output and invokeCount tool invocations.
 * @param runner The test runner to assert against.
 */
export function assertGcloudSuccess(runner: MockTestRunner,
                                    options: SuccessOption = {}): void {
  const invokeCount = options.invokeCount || 1;
  const gcloudOutput = options.gcloudOutput || '[gcloud output]';

  assertRunSuccess(runner);
  assert.equal(runner.invokedToolCount, invokeCount, 'Should invoke tool.');
  assert(runner.stdOutContained(gcloudOutput), 'Should capture gcloud output.');
}

/**
 * Asserts run success with no gcloud output and one tool invocation.
 * @param runner The test runner to assert against.
 */
export function assertGcloudSilentSuccess(runner: MockTestRunner): void {
  assertRunSuccess(runner);
  assert.equal(runner.invokedToolCount, 1, 'Should invoke tool once.');
  assert(!runner.stdOutContained('[gcloud output]'),
         'gcloud output should not be visible.');
}

/**
 * Asserts the key file was written and deleted.
 * @param runner The test runner to assert against.
 */
export function assertKeyFileWritten(runner: MockTestRunner): void {
  assert(runner.stdOutContained(`[task.writeFile]${s.jsonKeyFilePath}`),
         'tempKeyFile.json should be written.');
  assert(runner.stdOutContained(`[fs.unlinkSync]${s.jsonKeyFilePath}`),
         'tempKeyFile.json should be deleted.');
}

/**
 * Additionally asserts that the proper gcloud call was made to create the
 * kubeConfig file, and that the kubeConfig file was deleted.
 * @param runner The runner that should have performed the actions.
 * @param clusterCredentialExecString The exec string that should have been run.
 */
export function assertKubeKeyFileWritten(
    runner: MockTestRunner, clusterCredentialExecString: string): void {
  assertKeyFileWritten(runner);
  const ranConfig = runner.ran(clusterCredentialExecString);
  assert(ranConfig, 'Should have set up kubectl config.');
  const deletedConfig =
      runner.stdOutContained(`[fs.unlinkSync]${s.kubeConfigPath}`);
  assert(deletedConfig, 'Should have deleted kubectl config.');
}

/**
 * Asserts the run failed, there were no tool invocations, and the key file was
 * not written.
 * @param runner The test runner to assert against.
 */
export function assertGcloudNotRun(runner: MockTestRunner,
                                   checkVersion = false): void {
  assert(runner.failed, 'Should not have run.');
  if (checkVersion) {
    assert.equal(runner.invokedToolCount, 1,
                 'Should only call gcloud to check version.');
    assert(runner.ran(mock.gcloudVersionExecString),
           'Should have run check version.');
  } else {
    assert.equal(runner.invokedToolCount, 0, 'Should not have called gcloud.');
  }
  assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
  assert(!runner.createdErrorIssue(s.unhandledRejectionErrorMessage),
         'Should handle all rejections.');
  assert(!runner.stdOutContained(`[task.writeFile]${s.jsonKeyFilePath}`),
         'tempKeyFile.json should not be written.');
}
