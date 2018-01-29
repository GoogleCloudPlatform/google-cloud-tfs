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
 * @fileoverview The class CloudSdkPackage implements a Tool Installer for the
 * Google Cloud SDK.
 */
import {getDefaultExecOptions} from 'common/exec-options';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as task from 'vsts-task-lib/task';
import * as toolLib from 'vsts-task-tool-lib/tool';

type ValidPlatform = 'win32'|'linux'|'darwin';
type ValidArch = 'x64'|'x86'|'ia32';

/**
 * Validates that the given platform is one of the supported operating systems.
 * @returns true if platform is a ValidPlatform, false otherwise.
 */
function isValidPlatform(platform: string): platform is ValidPlatform {
  return platform === 'win32' || platform === 'linux' || platform === 'darwin';
}

/**
 * Validates that the given processor architecture is one of the supported
 * processor architectures.
 * @returns true if arch is a ValidArch, false otherwise.
 */
function isValidArch(arch: string): arch is ValidArch {
  return arch === 'x64' || arch === 'x86' || arch === 'ia32';
}

// Id of the Google Cloud SDK Tool.
const cloudSdkId = 'google-cloud-sdk';
// Root of the urls to get data from.
const urlRoot = 'http://dl.google.com/dl/cloudsdk/channels/rapid';
// Root url of all Google Cloud SDK download archives.
const downloadUrlRoot = `${urlRoot}/downloads`;
// Url of the version doc describing all Google Cloud SDK versions.
const versionDoc = `${urlRoot}/components-2.json`;

/**
 * This class implements finding, installing, and caching as a tool the Goolge
 * Cloud SDK.
 */
export class CloudSdkPackage {
  // The Version of the Google Cloud SDK this package will download.
  readonly version: string;
  // The path of the cached package.
  private toolPath: string;

  /**
   * Initializes the Cloud SDK package.
   * @param versionString The version of the Cloud SDK this package will
   * represend.
   * @param di Dependency injection object used in unit tests.
   */
  constructor(versionString: string, di: {toolLib: typeof toolLib}) {
    this.version = di.toolLib.cleanVersion(versionString);
    if (!this.version) {
      throw new Error(`Given version ${versionString} is not a valid version.`);
    }
    this.toolPath = di.toolLib.findLocalTool(cloudSdkId, this.version);
  }

  /**
   * Factory method for creating a Cloud SDK package object.
   */
  static async createPackage(versionSpec?: string, di = {http, task, toolLib}):
      Promise<CloudSdkPackage> {
    let version: string;
    if (!versionSpec) {
      version = await CloudSdkPackage.queryLatestVersion(di);
      di.task.debug(`Latest version ${version} selected.`);
    } else if (di.toolLib.isExplicitVersion(versionSpec)) {
      version = versionSpec;
      di.task.debug(`Version ${version} selected.`);
    } else {
      throw new Error('Version, if set, must be an explicit version.');
    }
    return new CloudSdkPackage(version, di);
  }

  /**
   * Returns the latest version of the Cloud SDK.
   */
  static async queryLatestVersion(di: {http: typeof http}): Promise<string> {
    const message = await new Promise<http.IncomingMessage>(
        (resolve, reject) =>
            di.http.get(versionDoc, resolve).on('error', reject));

    const data = await new Promise<string>((resolve) => {
      let rawData = '';
      message.on('data', (chunk: string) => rawData += chunk);
      message.on('end', () => resolve(rawData));
    });
    return JSON.parse(data)['version'] as string;
  }

  /**
   * Returns true if this version of the Cloud SDK tool is cached in the tool
   * cache.
   */
  isCached(): boolean { return Boolean(this.toolPath); }

  /**
   * Returns the path to the cached Cloud SDK.
   */
  getToolPath(): string { return this.toolPath; }

  /**
   * Initialize a cached version, or aquire, cache and initalize a new version.
   * @param allowReporting If true, allow usage reporting.
   */
  async initializeOrAcquire(allowReporting: boolean,
                           di = {toolLib, task, os}): Promise<void> {
    if (this.isCached()) {
      task.debug(`Initializing cached version`);
      await this.initialize(allowReporting, di);
    } else {
      task.debug(`Aquiring new version`);
      await this.acquire(allowReporting, di);
    }
  }

  /**
   * Initializes the cached Cloud SDK, setting the report usage data parameter.
   */
  async initialize(allowReporting: boolean,
                   di = {toolLib, task}): Promise<void> {
    di.toolLib.prependPath(path.join(this.toolPath, 'google-cloud-sdk', 'bin'));
    await di.task.tool(di.task.which('gcloud'))
        .line(`config set disable_usage_reporting ${!allowReporting}`)
        .exec(getDefaultExecOptions());
  }

  /**
   * Downloads, installs, and caches an unchached version of the Cloud SDK.
   */
  async acquire(allowReporting: boolean,
               di = {toolLib, task, os}): Promise<void> {
    const platform = di.os.platform();
    if (!isValidPlatform(platform)) {
      throw new Error(`Unsupported operating system: ${platform}.`);
    }
    const arch = di.os.arch();
    if (!isValidArch(arch)) {
      throw new Error(`Unsupported architecture: ${arch}.`);
    }
    const downloadUrl = this.getDownloadUrl(platform, arch);
    const downloadPath = await di.toolLib.downloadTool(downloadUrl);
    const extractedPath =
      await CloudSdkPackage.extractArchive(platform, downloadPath, di);
    this.toolPath = await di.toolLib.cacheDir(extractedPath, cloudSdkId,
      this.version, arch);
    const installFile = CloudSdkPackage.getInstallFile(platform);
    const installerPath =
        path.join(this.toolPath, 'google-cloud-sdk', installFile);
    const execOptions = getDefaultExecOptions();
    execOptions.env['CLOUDSDK_CORE_DISABLE_PROMPTS'] = 'true';
    execOptions.env['PATH'] = process.env['PATH'];
    execOptions.env['PROCESSOR_ARCHITECTURE'] =
      process.env['PROCESSOR_ARCHITECTURE'];
    di.task.debug(installerPath);
    await di.task.tool(installerPath)
        .line('--quiet')
        .line(`--usage-reporting ${allowReporting}`)
        .line('--additional-components kubectl')
        .exec(execOptions);
    di.toolLib.prependPath(path.join(this.toolPath, 'google-cloud-sdk', 'bin'));
  }

  /**
   * Gets the script file used to install the Cloud SDK on the given platform.
   */
  private static getInstallFile(platform: ValidPlatform): string {
    switch (platform) {
    case 'win32':
      return 'install.bat';
    case 'linux':
      return 'install.sh';
    case 'darwin':
      return 'install.sh';
    }
  }

  /**
   * Get the download URL of this Cloud SDK version for the given platform and
   * architecture.
   */
  private getDownloadUrl(platform: ValidPlatform, arch: ValidArch): string {
    const filePrefix = `google-cloud-sdk-${this.version}`;
    const archString = CloudSdkPackage.getOsArchString(arch);
    switch (platform) {
    case 'win32':
      return `${downloadUrlRoot}/${filePrefix}-windows-` +
             `${archString}-bundled-python.zip`;
    case 'linux':
      return `${downloadUrlRoot}/${filePrefix}-linux-${archString}.tar.gz`;
    case 'darwin':
      return `${downloadUrlRoot}/${filePrefix}-darwin-${archString}.tar.gz`;
    }
  }

  /**
   * Gets the architecture string for the package that support the given
   * processor architecture.
   */
  private static getOsArchString(arch: ValidArch): string {
    switch (arch) {
    case 'x64':
      return 'x86_64';
    case 'x86':
      return 'x86';
    case 'ia32':
      return 'x86';
    }
  }

  /**
   * Executes the approprate archive unzip method for the given platform on the
   * given file.
   * @param platform The name of the platform the Google Cloud SDK was built
   * for.
   * @param file The full path to the archive to extract.
   * @returns The path to the folder containing the contents of the archive.
   */
  private static async extractArchive(
      platform: ValidPlatform, file: string,
      di: {toolLib: typeof toolLib, os: typeof os}): Promise<string> {
    switch (platform) {
    case 'win32':
      return await di.toolLib.extractZip(file);
    case 'linux':
      return await di.toolLib.extractTar(file);
    case 'darwin':
      return await di.toolLib.extractTar(file);
    }
  }
}
