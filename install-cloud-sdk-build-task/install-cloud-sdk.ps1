Trace-VstsEnteringInvocation $MyInvocation

try {
    [bool] $AllowReporting = Get-VstsInput -Name "AllowReporting" -AsBool -Require
    [string] $Project = Get-VstsInput -Name "Project"
    [string] $Region = Get-VstsInput -Name "Region"
    [string] $Zone = Get-VstsInput -Name "Zone"
    [string] $Config = Get-VstsInput -Name "Config"
    [bool] $UpdatePath = Get-VstsInput -Name "UpdatePath" -AsBool -Require
    [string] $InstallPath = Get-VstsInput -Name "InstallPath"
    [bool] $ForceInstall = Get-VstsInput -Name "ForceInstall" -AsBool -Require

    $gCloudSDK = Get-Command gcloud -ErrorAction SilentlyContinue

    if ($gCloudSDK -ne $null -and -not $ForceInstall) {
        Write-Output "Cloud SDK already exists at $gCloudSDK"
    } else {

        $InstallerUri = "https://dl.google.com/dl/cloudsdk/channels/rapid/google-cloud-sdk.zip"
        $Path = Join-Path $MyInvocation.MyCommand.Path .. -Resolve

        $InstallerFile = Join-Path $Path "google-cloud-sdk.zip"

        if (-not $InstallPath) {
            $InstallPath = Join-Path $env:LOCALAPPDATA "Google\Cloud SDK"
            #$InstallPath = $Path
        }

        Write-Output "Installing Google Cloud SDK to $InstallPath"

        Write-VstsTaskVerbose "Downloading installer from $InstallerUri."
        Invoke-WebRequest -Uri $InstallerUri -OutFile $InstallerFile

        try {
            Add-Type -AssemblyName System.IO.Compression.FileSystem

            Write-VstsTaskVerbose "Extracting Google Cloud SDK to '$InstallPath'."
            if(Test-Path $InstallPath) {
                rm $InstallPath -Recurse
            }
            [System.IO.Compression.ZipFile]::ExtractToDirectory($InstallerFile, $InstallPath)

            $quietArg = "--quiet"
            $usageArg = "--usage-reporting $AllowReporting"
            $componentsArg = "--additional-components kubectl beta"
            $args = $quietArg, $usageArg, $componentsArg -join " "
            $env:CLOUDSDK_CORE_DISABLE_PROMPTS = $true
            Write-VstsTaskVerbose "Running installation script."
            Invoke-VstsTool "$InstallPath\google-cloud-sdk\install.bat" `
                -Arguments $args -WorkingDirectory $InstallPath

        } finally {
            rm $InstallerFile
        }
    }

    $cloudBinPath = Join-Path $InstallPath "google-cloud-sdk\bin"
    $env:Path = "$cloudBinPath;$env:Path"

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
