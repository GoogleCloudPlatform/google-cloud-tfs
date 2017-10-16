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

Describe "install-cloud-sdk" {
    BeforeAll {
        pushd $PSScriptRoot
        $vstsTaskSdkModule = Import-Module ..\ps_modules\VstsTaskSdk -PassThru -ArgumentList @{'NonInteractive' = 'true'}
        $oldEnv = ls env:
    }

    AfterAll {
        popd
        ls env: | rm
        $oldEnv | ?{ -not (Test-Path "env:$($_.Name)") }| %{ New-Item -Path "env:$($_.Name)" -Value $_.Value -ErrorAction Continue }
        $vstsTaskSdkModule | Remove-Module
    }

    Context "Success" {
        BeforeAll {
            $targetPath = [System.IO.Path]::GetTempFileName();
        }
        BeforeEach {
        }
        It "Runs" {
            $env:INPUT_AllowReporting = $true
            $env:INPUT_Project = ""
            $env:INPUT_Region = ""
            $env:INPUT_Zone = ""
            $env:INPUT_Config = ""
            $env:INPUT_InstallPath = $targetPath
            $env:INPUT_ForceInstall = $true
            $env:INPUT_CleanInstallPath = $true

            $result = Invoke-VstsTaskScript -ScriptBlock { . ..\install-cloud-sdk.ps1 } -Verbose
        }
    }
}
