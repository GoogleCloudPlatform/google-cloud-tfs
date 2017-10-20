<##
 # Copyright 2017 Google Inc.
 # 
 # Licensed under the Apache License, Version 2.0 (the "License");
 # you may not use this file except in compliance with the License.
 # You may obtain a copy of the License at
 # 
 #     http://www.apache.org/licenses/LICENSE-2.0
 # 
 # Unless required by applicable law or agreed to in writing, software
 # distributed under the License is distributed on an "AS IS" BASIS,
 # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 # See the License for the specific language governing permissions and
 # limitations under the License.
 ##>

Trace-VstsEnteringInvocation $MyInvocation

try {
    [bool] $AllowReporting = Get-VstsInput -Name "AllowReporting" -AsBool -Require
    [string] $Project = Get-VstsInput -Name "Project"
    [string] $Region = Get-VstsInput -Name "Region"
    [string] $Zone = Get-VstsInput -Name "Zone"
    [string] $Config = Get-VstsInput -Name "Config"
    [string] $InstallPath = Get-VstsInput -Name "InstallPath"
    [bool] $ForceInstall = Get-VstsInput -Name "ForceInstall" -AsBool -Require
    [bool] $CleanInstallPath = Get-VstsInput -Name "CleanInstallPath" -AsBool -Require

    # TFS does not include the user environment by default.
    $oldPath = $env:Path
    $env:Path += ";" + (Get-ItemProperty HKCU:\Environment\).Path
    $gcloudSdk = Get-Command gcloud -ErrorAction SilentlyContinue
    $env:Path = $oldPath

    if ($gcloudSdk -ne $null -and -not $ForceInstall) {
        $gcloudSdkPath = Split-Path $gcloudSdk.Path
        Write-Output "Cloud SDK already exists at $gcloudSdkPath"
        if (-not ($env:Path -contains $gcloudSdkPath)) {
            Write-VstsTaskVerbose "Setting Environment Path"
            $env:Path = "$env:Path;$gcloudSdkPath"
            Set-VstsTaskVariable "Path" $env:Path
            $disableReportingString = if($AllowReporting) {"false"} else {"true"}
            gcloud config set disable_usage_reporting $disableReportingString
        }
    } else {
        $InstallerUri = "https://dl.google.com/dl/cloudsdk/channels/rapid/google-cloud-sdk-windows-bundled-python.zip"
        $Path = Join-Path $MyInvocation.MyCommand.Path .. -Resolve

        $InstallerFile = Join-Path $Path "google-cloud-sdk.zip"

        if (-not $InstallPath) {
            $InstallPath = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK"
        }

        Write-Output "Installing Google Cloud SDK to $InstallPath"

        Write-VstsTaskVerbose "Downloading installer from $InstallerUri."
        Invoke-WebRequest -Uri $InstallerUri -OutFile $InstallerFile

        try {
            if ($CleanInstallPath) {
                if (Test-Path $InstallPath) {
                    Write-VstsTaskVerbose "Cleaning folder '$InstallPath'."
                    ls $InstallPath | rm -Recurse
                }
            }

            Write-VstsTaskVerbose "Extracting Google Cloud SDK to '$InstallPath'."
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            [System.IO.Compression.ZipFile]::ExtractToDirectory($InstallerFile, $InstallPath)

            $quietArg = "--quiet"
            $usageArg = "--usage-reporting $AllowReporting"
            $componentsArg = "--additional-components kubectl beta"
            $args = $quietArg, $usageArg, $componentsArg -join " "
            $env:CLOUDSDK_CORE_DISABLE_PROMPTS = $true
            Write-VstsTaskVerbose "Running installation script."
            Invoke-VstsTool "$InstallPath\google-cloud-sdk\install.bat" `
                -Arguments $args -WorkingDirectory $InstallPath
            
            $cloudBinPath = Join-Path $InstallPath "google-cloud-sdk\bin"
            $env:Path = "$env:Path;$cloudBinPath"
            Set-VstsTaskVariable "Path" $env:Path
        } finally {
            rm $InstallerFile
        }
    }

    if($Config) {
        Write-VstsTaskVerbose "Configuring $Config"
        $configs = gcloud config configurations list --format=json | ConvertFrom-Json
        if($configs | ? name -eq $Config) {
            Write-VstsTaskVerbose "Activating $Config"
            gcloud config configurations activate $Config
        } else {
            Write-VstsTaskVerbose "Creating $Config"
            gcloud config configurations create $Config
        }
    }

    if($Project) {
        Write-VstsTaskVerbose "Setting project to $Project"
        gcloud config set core/project $Project
    }

    if($Region) {
        Write-VstsTaskVerbose "Setting region to $Region"
        gcloud config set compute/region $Region
    }

    if($Zone) {
        Write-VstsTaskVerbose "Setting zone to $Zone"
        gcloud config set compute/zone $Zone
    }
} finally {
    Trace-VstsLeavingInvocation $MyInvocation
}
