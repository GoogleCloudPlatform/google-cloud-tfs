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
import * as ctTfsAssert from 'common/asserts';
import {toKebabCase} from 'common/strings';
import * as path from 'path';
import {MockTestRunner} from 'vsts-task-lib/mock-test';

import * as s from '../../strings';

import * as tc from './test-constants';

describe('deploy-gke using values', () => {
  const credentialExecString = tc.clusterCredentialExecString;

  let runner: MockTestRunner;
  beforeEach(() => { runner = null; });

  afterEach(function(): void {
    if (this.currentTest.state === 'failed') {
      console.log(runner.stdout);
      console.log('--------------------');
      console.log(runner.stderr);
    }
  });

  describe('missing required parameters', () => {
    const requiredParameters: string[] = [
      'deploymentName',
      'imageName',
      'imageTag',
      'replicas',
    ];

    for (const param of requiredParameters) {
      it(`should fail with missing ${param} parameter`, () => {
        const kebobed = toKebabCase(param);
        const testPath = path.join(__dirname, `missing-${kebobed}.js`);
        runner = new MockTestRunner(testPath);
        runner.run();

        assert(runner.failed, 'Should have failed.');
        ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
        assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
        assert(runner.createdErrorIssue(`Input required: ${param}`),
               `Should be looking for ${param}.`);
        assert.equal(runner.invokedToolCount, 1,
                     'Should only run the kube credentials command');
      });
    }
  });

  it('should fail with non-integer replica.', () => {
    const testPath = path.join(__dirname, 'invalid-replica-string.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
    assert(
        runner.createdErrorIssue(s.nanReplicaMessage(tc.invalidReplicaString)),
        'Should warn for invalid replica parameter.');
    assert.equal(runner.invokedToolCount, 1,
                 'Should only run the kube credentials command');
  });

  it('should fail with negative integer replicas.', () => {
    const testPath = path.join(__dirname, 'invalid-replica-negative.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
    const message = s.negitiveReplicaMessage(tc.invalidReplicaNegitive);
    assert(runner.createdErrorIssue(message),
           'Should warn for invalid replica parameter.');
    assert.equal(runner.invokedToolCount, 1,
                 'Should only run the kube credentials command');
  });

  it('should fail if get deployments fails.', () => {
    const testPath = path.join(__dirname, 'fail-get-deployments.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
    assert(runner.createdErrorIssue(tc.gcloudError),
           'Should error with gcloud stderr.');
    assert.equal(
        runner.invokedToolCount, 2,
        'Should run two commands (get credentials and get deployments)');
  });

  it('should fail for invalid deployment output.', () => {
    const testPath = path.join(__dirname, 'invalid-get-deployments.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
    assert.equal(
        runner.invokedToolCount, 2,
        'Should run two commands (get credentials and get deployments)');
  });

  it('should fail when kubectl run fails', () => {
    const testPath = path.join(__dirname, 'fail-run.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
    const seeStdout = runner.stdOutContained(tc.gcloudOutput);
    assert(seeStdout, 'Should see stdout in output.');
    const seeStderr = runner.stdOutContained(tc.gcloudError);
    assert(seeStderr, 'Should see stderr in output.');
    assert.equal(runner.invokedToolCount, 3, 'Should run three commands.');
  });

  it('should succeed with kubectl run.', () => {
    const testPath = path.join(__dirname, 'run-success.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    const seeOutput = runner.stdOutContained(tc.gcloudOutput);
    assert(seeOutput, 'Should see stdout in output.');
    const seeStderr = runner.stdOutContained(tc.gcloudError);
    assert(seeStderr, 'Should see stderr in output.');
    assert.equal(runner.invokedToolCount, 3, 'Should run three commands.');
  });

  it('should succeed with kubectl run dryRun.', () => {
    const testPath = path.join(__dirname, 'run-success-dry-run.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    const seeOutput = runner.stdOutContained(tc.gcloudOutput);
    assert(seeOutput, 'Should see stdout in output.');
    const seeStderr = runner.stdOutContained(tc.gcloudError);
    assert(seeStderr, 'Should see stderr in output.');
    assert.equal(runner.invokedToolCount, 3, 'Should run three commands.');
  });

  it('should skip both scale and set image', () => {
    const testPath = path.join(__dirname, 'skip-both-scale-set-image.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    assert.equal(
        runner.invokedToolCount, 2,
        'Should run two commands (get credentials and get deployments).');
    assert(runner.stdOutContained(s.skipSetImage(tc.deploymentName, tc.image)),
           'Should see skip set image message.');
    assert(runner.stdOutContained(
               s.skipRescale(tc.deploymentName, tc.replicasInt)),
           'Should see skip rescale message.');
  });

  it('should succeed at just scale', () => {
    const testPath = path.join(__dirname, 'scale-success.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    assert.equal(runner.invokedToolCount, 3, 'Should run three commands.');
    assert(runner.ran(tc.kubectlScaleExecString), 'Should run scale.');
    assert(runner.stdOutContained(s.skipSetImage(tc.deploymentName, tc.image)),
           'Should see skip set image message.');
  });

  it('should succeed at just set image', () => {
    const testPath = path.join(__dirname, 'set-image-success.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    assert.equal(runner.invokedToolCount, 3, 'Should run three commands.');
    assert(runner.ran(tc.kubectlSetImageExecString), 'Should run set image.');
    assert(runner.stdOutContained(
               s.skipRescale(tc.deploymentName, tc.replicasInt)),
           'Should see skip rescale message.');
  });

  it('should succeed at just scale in a dry run', () => {
    const testPath = path.join(__dirname, 'scale-success-dry-run.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    assert.equal(runner.invokedToolCount, 2, 'Should run two commands.');
    assert(runner.stdOutContained(
               s.rescaledDryRun(tc.deploymentName, tc.moreReplicasInt)),
           'Should receive replica dry run message.');
    assert(runner.stdOutContained(s.skipSetImage(tc.deploymentName, tc.image)),
           'Should see skip set image message.');
  });

  it('should succeed at just set image in a dry run', () => {
    const testPath = path.join(__dirname, 'set-image-success-dry-run.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    assert.equal(runner.invokedToolCount, 2, 'Should run two commands.');
    assert(runner.stdOutContained(
               s.imageSetDryRun(tc.deploymentName, tc.newImage)),
           'Should receive replica dry run message.');
    assert(runner.stdOutContained(
               s.skipRescale(tc.deploymentName, tc.replicasInt)),
           'Should see skip rescale message.');
  });

  it('should fail when kubectl scale fails.', () => {
    const testPath = path.join(__dirname, 'fail-scale.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    assert.equal(runner.invokedToolCount, 4, 'Should run four commands.');
    assert(runner.ran(tc.kubectlSetImageExecString),
           'Should have run set image.');
    assert(runner.ran(tc.kubectlScaleExecString), 'Should have run scale.');
  });

  it('should fail when kubectl set image fails.', () => {
    const testPath = path.join(__dirname, 'fail-set-image.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    assert.equal(runner.invokedToolCount, 4, 'Should run four commands.');
    assert(runner.ran(tc.kubectlSetImageExecString),
           'Should have run set image.');
    assert(runner.ran(tc.kubectlScaleExecString), 'Should have run scale.');
  });

  it('should fail when both scale and set image fail', () => {
    const testPath = path.join(__dirname, 'fail-both-scale-set-image.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.failed, 'Should have failed.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 1, 'Should have one error.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    assert.equal(runner.invokedToolCount, 4, 'Should run four commands.');
    assert(runner.ran(tc.kubectlScaleExecString), 'Should have run scale.');
    assert(runner.ran(tc.kubectlSetImageExecString),
           'Should have run set image.');
  });

  it('should succeed with both scale and set image', () => {
    const testPath = path.join(__dirname, 'both-scale-set-image-success.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    assert.equal(runner.invokedToolCount, 4, 'Should run four commands.');
    assert(runner.ran(tc.kubectlScaleExecString), 'Should have run scale.');
    assert(runner.ran(tc.kubectlSetImageExecString),
           'Should have run set image.');
  });

  it('should succeed with both scale and set image in a dry run', () => {
    const testPath =
        path.join(__dirname, 'both-scale-set-image-success-dry-run.js');
    runner = new MockTestRunner(testPath);
    runner.run();

    assert(runner.succeeded, 'Should have succeeded.');
    ctTfsAssert.assertKubeKeyFileWritten(runner, credentialExecString);
    assert.equal(runner.errorIssues.length, 0, 'Should have no errors.');
    assert.equal(runner.warningIssues, 0, 'Should have no warnings.');
    assert.equal(runner.invokedToolCount, 2, 'Should run two commands.');
    assert(runner.stdOutContained(
               s.rescaledDryRun(tc.deploymentName, tc.moreReplicasInt)),
           'Should receive replica dry run message.');
    assert(runner.stdOutContained(
               s.imageSetDryRun(tc.deploymentName, tc.newImage)),
           'Should receive set image dry run message.');
  });
});
