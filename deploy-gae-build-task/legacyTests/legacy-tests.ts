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
import * as gcloudAssert from 'common/asserts';
import SuccessOption = gcloudAssert.SuccessOption;
import * as path from 'path';
import {MockTestRunner} from 'vsts-task-lib/mock-test';

import * as strings from '../string-constants';

describe('legacy tests', () => {

  let runner: MockTestRunner;
  beforeEach(() => { runner = null; });

  afterEach(function(): void {
    if (this.currentTest.state === 'failed') {
      console.log(runner.stdout);
      console.log('--------------------');
      console.log(runner.stderr);
    }
  });

  const deployPath = path.resolve('Test', 'deploy');
  const sourcePath = path.resolve('Test', 'source');
  const sourceYamlPath = path.join(sourcePath, 'app.yaml');
  const options: SuccessOption = {invokeCount : 2};

  it('should fail for no gcloud', () => {
    const testPath = path.join(__dirname, 'no-gcloud.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
  });

  it('should fail for old gcloud', () => {
    const testPath = path.join(__dirname, 'old-gcloud.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner, true);
    assert(runner.stdOutContained(strings.oldGcloudVersionError),
           'Should describe error');
  });

  it('should fail when gcloud fails', () => {
    const testPath = path.join(__dirname, 'gcloud-fails.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should not have succeeded.');
    assert.equal(runner.invokedToolCount, 2, 'Should invoke tool twice.');
    assert.equal(runner.warningIssues.length, 0, 'Should have no warnings.');
    assert.equal(runner.errorIssues.length, 1, 'Should have an error.');
    assert(runner.stdOutContained('[gcloud error]'),
           'Should write stderr as issue.');
    assert(runner.stdOutContained('[gcloud output]'),
           'Should capture gcloud output.');
    gcloudAssert.assertKeyFileWritten(runner);
  });

  it('should succeed with deploying an app with normal inputs', () => {
    const testPath = path.join(__dirname, 'deploy-app.js');
    runner = new MockTestRunner(testPath);
    runner.run();
    gcloudAssert.assertGcloudSuccess(runner, options);
    assert(!runner.stdOutContained('###copying###'),
           'Should not copy yaml file.');
  });

  it('should succeed using sourceFolder', () => {
    const testPath = path.join(__dirname, 'using-source-folder.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudSuccess(runner, options);
    assert(runner.stdOutContained('###copying###'), 'Should copy yaml file.');
    assert(runner.stdOutContained(`copying ${sourceYamlPath} to ${deployPath}`),
           'Should copy yaml file.');
  });

  it('should succeed using storageBucket', () => {
    const testPath = path.join(__dirname, 'using-storage-bucket.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudSuccess(runner, options);
  });

  it('should succeed using version', () => {
    const testPath = path.join(__dirname, 'using-version.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudSuccess(runner, options);
  });

  it('should succeed setting promote to false', () => {
    const testPath = path.join(__dirname, 'using-promote-false.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudSuccess(runner, options);
  });

  it('should succeed setting stopPrevious to false', () => {
    const testPath = path.join(__dirname, 'using-stop-previous-false.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudSuccess(runner, options);
  });

  it('should fail with missing serviceEndpoint', () => {
    const testPath = path.join(__dirname, 'missing-service-endpoint.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: serviceEndpoint'),
           'Should be looking for serviceEndpoint.');
  });

  it('should fail with missing deploymentPath', () => {
    const testPath = path.join(__dirname, 'missing-deployment-path.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: deploymentPath'),
           'Should be looking for deploymentPath.');
  });

  it('should fail with missing yamlFileName', () => {
    const testPath = path.join(__dirname, 'missing-yaml-file-name.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: yamlFileName'),
           'Should be looking for yamlFileName.');
  });

  it('should fail with missing copyYaml', () => {
    const testPath = path.join(__dirname, 'missing-copy-yaml.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: copyYaml'),
           'Should be looking for copyYaml.');
  });

  it('should fail with missing sourceFolder', () => {
    const testPath = path.join(__dirname, 'missing-source-folder.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: sourceFolder'),
           'Should be looking for sourceFolder.');
  });

  it('should fail with missing promote', () => {
    const testPath = path.join(__dirname, 'missing-promote.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: promote'),
           'Should be looking for promote.');
  });

  it('should fail with missing stopPrevious', () => {
    const testPath = path.join(__dirname, 'missing-stop-previous.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    gcloudAssert.assertGcloudNotRun(runner);
    assert(runner.stdOutContained('Input required: stopPrevious'),
           'Should be looking for stopPrevious.');
  });
});
