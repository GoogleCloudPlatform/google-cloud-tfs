import {catchAll} from 'common/handle-rejection';
import {IncomingMessage} from 'http';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import * as task from 'vsts-task-lib';
import * as toolLib from 'vsts-task-tool-lib/tool';

const cloudSdkId = 'google-cloud-sdk';

async function run(): Promise<void> {
  const versionSpec = task.getInput('version', false);
  const allowReporting = task.getBoolInput('allowReporting', true);

  let version: string;
  if (!versionSpec) {
    version = await queryLatestVersion();
  } else if (toolLib.isExplicitVersion(versionSpec)) {
    version = versionSpec;
  } else {
    throw new Error('Version, if set, must be an explicit version.');
  }

  let toolPath = toolLib.findLocalTool(cloudSdkId, version);
  if (!toolPath) {
    toolPath = await aquireCloudSdk(version, allowReporting);
    toolLib.prependPath(path.join(toolPath, 'google-cloud-sdk', 'bin'));
  } else {
    toolLib.prependPath(path.join(toolPath, 'google-cloud-sdk', 'bin'));
    await task.tool(task.which('gcloud'))
        .line(`config set disable_usage_reporting ${allowReporting}`)
        .exec();
  }
}

async function aquireCloudSdk(version: string, allowReporting: boolean): Promise<string> {
  version = toolLib.cleanVersion(version);
  let downloadUrl: string;
  let extractFunction: (path: string) => Promise<string>;
  let installFile: string;
  const osPlatform = os.platform();
  [downloadUrl, extractFunction, installFile] =
      getOsSpecificValues(osPlatform, version);
  const downloadPath: string = await toolLib.downloadTool(downloadUrl);
  const extractedPath = await extractFunction(downloadPath);
  const toolPath = await toolLib.cacheDir(extractedPath, cloudSdkId, version);
  const installerPath = path.join(toolPath, 'google-cloud-sdk', installFile);
  await task.tool(installerPath)
      .arg('--quiet')
      .arg(`--usage-reporting ${allowReporting}`)
      .arg('--additional-components kubectl beta')
      .exec();
  return toolPath;
}

function getOsSpecificValues(osPlatform: NodeJS.Platform,
    version: string): [ string, (path: string) => Promise<string>, string] {
  let osName: string;
  let fileEnding: string;
  let extractFunction: (path: string) => Promise<string>;
  let installFile: string;
  switch (osPlatform) {
    case 'win32':
      osName = 'windows';
      fileEnding = '-bundled-python.zip';
      extractFunction = toolLib.extractZip;
      installFile = 'install.bat';
      break;
    case 'linux':
    case 'darwin':
      osName = osPlatform;
      fileEnding = 'tar.gz';
      extractFunction = toolLib.extractTar;
      installFile = 'install.sh';
      break;
    default:
      throw new Error(`Unsupported operating system: ${osPlatform}.`);
  }
  const osArch = os.arch();
  let archVal: string;
  switch (osArch) {
    case 'x64':
      archVal = 'x86_64';
      break;
    case 'x86':
      archVal = 'x86';
      break;
    default:
      throw new Error(`Unsupported architecture: ${osArch}`);
  }

  const dlPath = 'https://dl.google.com/dl/cloudsdk/channels/rapid/downloads';
  return [
    `${dlPath}/google-cloud-sdk-${version}-${osName}-${archVal}${fileEnding}`,
    extractFunction,
    installFile
  ];
};

async function queryLatestVersion(): Promise<string> {
  const versionSpec =
    'https://dl.google.com/dl/cloudsdk/channels/rapid/components-2.json';
  const res: IncomingMessage =
      await new Promise<IncomingMessage>((resolve, reject) => {
        https.get(versionSpec, resolve).on('error', reject);
      });

  const data: string = await new Promise<string>(
    (resolve) => {
      let rawData: string = '';
      res.on('data', (chunk) => rawData += chunk);
      res.on('end', () => resolve(rawData));
    });
  return JSON.parse(data)['version'] as string;
}

catchAll(run());
