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

import * as assert from 'assert';
import * as GctTfsAssert from 'common/asserts';
import {toKebabCase} from 'common/strings';
import * as path from 'path';
import {MockTestRunner} from 'vsts-task-lib/mock-test';

import * as tc from './test-constants';

describe('deploy-gke with apply config', () => {
  const execString = tc.kubectlApplyExecString;
  const dryExecString = tc.kubectlApplyDryRunExecString;
  const credentialExecString = tc.clusterCredentialExecString;

  let runner: MockTestRunner;
  beforeEach(function() {
    runner = null;
  });

  afterEach(function() {
    if (this.currentTest.state === 'failed') {
      console.log(runner.stdout);
      console.log('--------------------');
      console.log(runner.stderr);
    }
  });

  describe('missing required parameters', () => {
    const requiredParameters: string[] = [
      'updateTag',
      'configPath',
      'imageName',
      'imageTag',
    ];

    requiredParameters.forEach((param: string) => {
      it(`should fail with missing ${param} parameter`, () => {
        const kebobed = toKebabCase(param);
        const testPath = path.join(__dirname, `missing-${kebobed}.js`);
        runner = new MockTestRunner(testPath);
        runner.run();

        assert(runner.failed, 'Should have failed.');
        GctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
        assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
        assert(
            runner.createdErrorIssue(`Input required: ${param}`),
            `Should be looking for ${param}.`);
      });
    });
  });

  for (const configType of Object.keys(tc.configs)) {
    it(`should replace image in ${configType} config`, () => {
      const kebobed = toKebabCase(configType);
      const testPath = path.join(__dirname, `replace-image-${kebobed}.js`);
      runner = new MockTestRunner(testPath);
      runner.run();

      assert(runner.succeeded, 'Should have succeeded.');
      GctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
      assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
      assert.equal(runner.warningIssues.length, 0, 'Should have no warnings.');
      assert(
          runner.stdOutContained(`[task.writeFile]${tc.configPath}`),
          'Should have written update to config.');
      const wroteNewContents = runner.stdOutContained(
          `[task.writeFile contents]${tc.configs[configType].newContents}`);
      assert(wroteNewContents, 'New contents should be correct.');
      assert(runner.ran(execString), 'Should have run kubectl apply.');
    });
  }

  it('should fail to replace image for invalid config', () => {
    const testPath = path.join(__dirname, `replace-image-error.js`);
    runner = new MockTestRunner(testPath);
    runner.run();
    assert(runner.failed, 'Should have failed.');
    GctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 3, 'Should have three errors.');
    assert(
        !runner.stdOutContained(`[task.writeFile]${tc.configPath}`),
        'Should not have written update to config.');

    const ranKubeCtlApply = runner.ran(execString);
    assert(!ranKubeCtlApply, 'Should not have run kubectl apply.');
  });

  it('should fail if kubectl apply fails.', () => {
    const testPath = path.join(__dirname, `fail-kubectl-apply.js`);
    runner = new MockTestRunner(testPath);
    runner.run();
    assert(runner.failed, 'Should have failed.');
    GctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
    assert(
        !runner.stdOutContained(`[task.writeFile]${tc.configPath}`),
        'Should not have written update to config.');
    assert(runner.ran(execString), 'Should have run kubectl apply.');
  });

  it('should succeed without updating tag.', () => {
    const testPath = path.join(__dirname, `success-no-update-tag.js`);
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    GctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues.length, 0, 'Should have no warnings');

    const wroteConfig =
        runner.stdOutContained(`[task.writeFile]${tc.configPath}`);
    assert(!wroteConfig, 'Should not have written update to config.');
    assert(runner.ran(execString), 'Should have run kubectl apply.');
  });

  it('should succeed dry run with updating tag.', () => {
    const testPath = path.join(__dirname, `success-dry-run-update-tag.js`);
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    GctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues.length, 0, 'Should have no warnings.');
    assert(
        runner.stdOutContained(`[task.writeFile]${tc.configPath}`),
        'Should have written update to config.');
    const wroteNewContents = runner.stdOutContained(
        `[task.writeFile contents]${tc.configs.json.newContents}`);
    assert(wroteNewContents, 'New contents should be correct.');

    assert(
        runner.stdOutContained(tc.configs.json.contents),
        'Should write contents of file to output.');
    assert(runner.ran(dryExecString), 'Should have run kubectl apply.');
  });
});
