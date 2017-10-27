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
 * @fileoverview This is a test suite that tests the container-build task.
 * @author przybjw@google.com (Jim Przybylinski)
 */
import 'mocha';

import * as assert from 'assert';
import * as gcloudAssert from 'common/asserts';
import * as path from 'path';
import {MockTestRunner} from 'vsts-task-lib/mock-test';

import {gcloudError, gcloudImageOutput, successOption} from './test-constants';

describe('container-build', () => {

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

    gcloudAssert.assertGcloudNotRun(runner);
  });

  describe.skip('reqire Mock-ToolRunner to emit stdline', () => {
    it('should fail when gcloud fails', () => {
      const testPath = path.join(__dirname, 'gcloud-fails.js');
      runner = new MockTestRunner(testPath);
      runner.run();

      assert(runner.failed, 'Should not have succeeded.');
      assert.equal(runner.invokedToolCount, 1, 'Should invoke tool once.');
      assert.equal(runner.warningIssues.length, 0, 'Should have no warnings.');
      assert.equal(runner.errorIssues.length, 1, 'Should have an error.');
      assert(runner.createdErrorIssue(gcloudError),
             'Should write stderr as issue.');
      assert(runner.stdOutContained(gcloudImageOutput),
             'Should capture gcloud output.');
      gcloudAssert.assertKeyFileWritten(runner);
    });

    it('should succeed using default buildConfigType', () => {
      const testPath = path.join(__dirname, 'using-default-config.js');
      runner = new MockTestRunner(testPath);
      runner.run();

      gcloudAssert.assertGcloudSuccess(runner, successOption);
    });

    it('should succeed using default buildConfigType and extra parameters',
       () => {
         const testPath =
             path.join(__dirname, 'using-default-config-all-params.js');
         runner = new MockTestRunner(testPath);
         runner.run();

         gcloudAssert.assertGcloudSuccess(runner, successOption);
       });

    it('should succeed using custom buildConfigType', () => {
      const testPath = path.join(__dirname, 'using-custom-config.js');
      runner = new MockTestRunner(testPath);
      runner.run();

      gcloudAssert.assertGcloudSuccess(runner, successOption);
    });

    it('should succeed using custom buildConfigType and extra parameters',
       () => {
         const testPath =
             path.join(__dirname, 'using-custom-config-all-params.js');
         runner = new MockTestRunner(testPath);
         runner.run();

         gcloudAssert.assertGcloudSuccess(runner, successOption);
       });

    it('should succeed using docker buildConfigType', () => {
      const testPath = path.join(__dirname, 'using-dockerfile.js');
      runner = new MockTestRunner(testPath);
      runner.run();

      gcloudAssert.assertGcloudSuccess(runner, successOption);
    });

    it('should succeed using docker buildConfigType and extra parameters',
       () => {
         const testPath =
             path.join(__dirname, 'using-dockerfile-all-params.js');
         runner = new MockTestRunner(testPath);
         runner.run();

         gcloudAssert.assertGcloudSuccess(runner, successOption);
       });
  });

  it('should fail with missing service endpoint', () => {
    const testPath = path.join(__dirname, 'missing-service-endpoint.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: serviceEndpoint'),
           'Should be looking for serviceEndpoint.');
  });

  it('should fail with missing deployment path', () => {
    const testPath = path.join(__dirname, 'missing-deployment-path.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: deploymentPath'),
           'Should be looking for deploymentPath.');
  });

  it('should fail with missing build config type', () => {
    const testPath = path.join(__dirname, 'missing-build-config-type.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: buildConfigType'),
           'Should be looking for buildConfigType.');
  });

  it('should fail with missing registry', () => {
    const testPath = path.join(__dirname, 'missing-registry.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: registry'),
           'Should be looking for registry.');
  });

  it('should fail with missing image name', () => {
    const testPath = path.join(__dirname, 'missing-image-name.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: imageName'),
           'Should be looking for imageName.');
  });

  it('should fail with missing cloud build file', () => {
    const testPath = path.join(__dirname, 'missing-cloud-build-file.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: cloudBuildFile'),
           'Should be looking for cloudBuildFile.');
  });
});
