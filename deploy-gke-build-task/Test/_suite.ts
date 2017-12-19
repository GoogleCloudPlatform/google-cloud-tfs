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
 *   outputs for the deploy-gke-image build task.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import './apply-config/_suite';
import './set-deployment/_suite';

import * as assert from 'assert';
import * as gcloudAssert from 'common/asserts';
import {toKebabCase} from 'common/strings';
import * as path from 'path';
import {MockTestRunner} from 'vsts-task-lib/mock-test';

import * as tc from './test-constants';

describe('deploy-gke build task', () => {
  let runner: MockTestRunner;
  beforeEach(function(): void { runner = null; });

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

    gcloudAssert.assertGcloudNotRun(runner);
  });

  it('should fail for no kubectl', () => {
    const testPath = path.join(__dirname, 'no-kubectl.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
  });

  describe('missing required parameters', () => {
    const requiredParameters: string[] = [
      'serviceEndpoint',
      'cluster',
      'zone',
      'deployType',
      'dryRun',
    ];

    for (const param of requiredParameters) {
      it(`should fail with missing ${param} parameter`, () => {
        const kebobed = toKebabCase(param);
        const testPath = path.join(__dirname, `missing-${kebobed}.js`);
        runner = new MockTestRunner(testPath);
        runner.run();

        gcloudAssert.assertGcloudNotRun(runner);
        assert(runner.stdOutContained(`Input required: ${param}`),
               `Should be looking for ${param}.`);
      });
    }
  });

  it('should fail when "gcloud container clusters get-credentials" fails',
     () => {
       const testPath = path.join(__dirname, 'fail-gcloud-get-credentials.js');
       runner = new MockTestRunner(testPath);
       runner.run();

       assert.equal(runner.invokedToolCount, 1, 'Should call gcloud once.');
       assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
       assert(runner.createdErrorIssue(tc.gcloudError),
              'Should send include stderr as error message.');
       gcloudAssert.assertKeyFileWritten(runner);
     });

  it('should fail with invalid deployType', () => {
    const testPath = path.join(__dirname, 'invalid-deploy-type.js');
    runner = new MockTestRunner(testPath);
    runner.run();
    assert.equal(runner.invokedToolCount, 1, 'Should call gcloud once.');
    assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
    assert(runner.createdErrorIssue('Invalid deployType "invalid"'),
           'Should error on invalid deployType.');
    gcloudAssert.assertKubeKeyFileWritten(runner,
                                          tc.clusterCredentialExecString);
  });
});
