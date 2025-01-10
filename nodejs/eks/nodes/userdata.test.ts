// Copyright 2016-2024, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
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

import * as pulumi from "@pulumi/pulumi";

import { OperatingSystem } from "./ami";
import {
    createUserData,
    getClusterDnsIp,
    ManagedNodeUserDataArgs,
    requiresCustomUserData,
    SelfManagedV1NodeUserDataArgs,
    SelfManagedV2NodeUserDataArgs,
    UserDataArgs,
} from "./userdata";

describe("requiresCustomUserData", () => {
    it("should return true if all args are defined", () => {
        const args = {
            bootstrapExtraArgs: "--arg1 value1",
            kubeletExtraArgs: "--arg2 value2",
            bottlerocketSettings: pulumi.output({
                settings: {
                    kubernetes: {
                        "max-pods": 500,
                    },
                },
            }),
            nodeadmExtraOptions: [
                {
                    contentType: `text/x-shellscript; charset="us-ascii"`,
                    content: `#!/bin/bash\necho "Hello, World!"`,
                },
            ],
        };
        const result = requiresCustomUserData(args);
        expect(result).toBe(true);
    });

    it("should return false if all args are undefined", () => {
        const args = {
            bootstrapExtraArgs: undefined,
            kubeletExtraArgs: undefined,
            bottlerocketSettings: undefined,
            nodeadmExtraOptions: undefined,
        };
        const result = requiresCustomUserData(args);
        expect(result).toBe(false);
    });

    it("should return true if any of the args is defined", () => {
        const args = {
            bootstrapExtraArgs: "--arg1 value1",
            kubeletExtraArgs: undefined,
            bottlerocketSettings: undefined,
            nodeadmExtraOptions: undefined,
        };
        const result = requiresCustomUserData(args);
        expect(result).toBe(true);
    });
});

describe("createUserData", () => {
    describe("linux", () => {
        it("should return the correct user data for a basic NodeGroup v1", () => {
            const userDataArgs: SelfManagedV1NodeUserDataArgs = {
                nodeGroupType: "self-managed-v1",
                awsRegion: "us-west-2",
                stackName: "example-cluster-1-98075617",
                extraUserData: undefined,
            } as SelfManagedV1NodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2,
                {
                    name: "example-cluster-1-eksCluster-291f2c0",
                    apiServerEndpoint:
                        "https://71E3210BB45D2B930AAA878706C3E369.sk1.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJSDQzcy9uaGFBcmN3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEUzTlROYUZ3MHpOREEyTURFeE9USXlOVE5hTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUUNyQVlKb3p2YTRsY0NmQm9jY243N0FPSEdxeHdFWHkyczRBc3pJMGZ0WldIU1RKL0lnVlBLRHJKeEoKS01UQUZEaHJRZTBGdzFBVmxLdjZFWVE0M0x6UzhJZFBpSytEM2U3Tnh5M3JJdktVWUtPSVIxeE5ocUNYZzNJQwo0TWx4cS9VUzlqT2FYenM2dFRxYlY0NExESE94MXQydE96bWtTUjlvV1FBVm9yTk9KVVBMRnViSmpGQ0xsK09JCm9KMHJsWDRicFpkUzJhb2F4S2dLakFmN0N5aVV6czhZbHYza1F3b3ZJeElGUk9kSEdwaGJOejRzREZzdUE1VHQKVGE5cUdjbHdISDJ1WEdBa2dYTGRvZC91d1dIQ01TYk9PcVpOOVkwZEc5NzZkQ1F6a0NsUlBWc3FtTTgxNEkwNAp5MlFzYktpc0Q1dDI3V01BSHVjbmcwSVBSS3VEQWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJUazdWeE95ZzZDS3RHdlRLZGlPZkJpbzluYVp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ2JaMHBPcGovUQpuVXdjZm82M2ljTlArejFIRE14T1dueGdESGhpVlBLUVhHazNrSUVwai9QUlpyMXdGQkxLc0Nud1hnVkNuWWpzCldIMU9vUmZpaXZNR1ozaDAwQWhIdVNVUEVLc2dONjdsdldqbGR6LzlDeDVxMFJsRE9ucTRVWC94dWEvM1d0NVoKOUxhS2hpc2x0Z3FsZjJRbW5KNGo3QXB2bTVKM044ak9PdTQ0WXpGYjJ5RHZzMXVDQm9aZ1J2NzRIQVhTUW53MAp5OWNJU2RCNFJrZkEwZHEzaHRnWThoekxGN3JXZmNvRVFNUm1oY0JYRmVRVVo2ZjZmRlZ4eUFIOFBwbGFnMElQCjR3RE91UGRDMmZ5VGJKOFB4bjg4VkJhWnd3c3I2RUU0cXNUK1VaYnQ5ZHIwanZZb0xBTEdJaVpWRk9TRnVqL1cKWG9OR3VyT3Jra3E3Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );
            expect(userData).toMatchSnapshot();
        });

        it("should return the correct user data for a basic NodeGroup v2", () => {
            const userDataArgs: SelfManagedV2NodeUserDataArgs = {
                nodeGroupType: "self-managed-v2",
                stackName: "example",
                labels: {
                    ondemand: "true",
                },
            } as unknown as SelfManagedV2NodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2,
                {
                    name: "example-nodegroup-iam-simple-eksCluster-7c35aee",
                    apiServerEndpoint:
                        "https://5BAAC422E1495BD874E1343C0FB41CE3.sk1.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQ3RpeGVHNWpiKzh3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEUzTWpoYUZ3MHpOREEyTURFeE9USXlNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURDYlJjUXlUWU1RNm1JdXRReHJseE0vUnlES0VpQTFiTDQ4YmFnV25USDVLZ1YvQmF0TnF4c2NITm8KbSsrR0puck1sVGJnTTkweEllM1RlaXR5KzNINDJnRnlwaTZCanZ1TnFjV1FabUpaUzFQb2RxZXNHdHdHeFhITAp4Tk4yb1ZOQXdDS2tvdjY5dkpvamZUYkJUdEZVVUVVSHhRVDRzTzE5L0xNdlZZcUcySkxQOFkxV1FVOVZYTzdYCnlHcGFtMjZUZ2l4L0lyem53dTg3QVVLTS9VSTV6RUtPU1NqM1pLNU56azlac05YQldSYmF4bTJBM2s4NUE1VWkKQXZBY0ZVaDlzcHAyWmt4UXhkTG1ndkh4L0RrZEVoRWVKNFJnbnVwZjI2QVl0aEVFZjRnY0U1S1NGWDFRZXhiSwp4aCtYRXZDU1lGU0ZXZDExNmdTOVQyRUdFT3FSQWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJTbnF2VU5aRmVaOFRqV0NJRy9UUzZ1M0Zjek9EQVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ3g0c1ZRTjdrOQpDbzNrUUI2ZnRLaHczSjNCSmc4bnZXL0QwVlMwOEp3cWNyblhzVXVzczBTTmQydkZvSGZKenNYZlhUV21LZ1dUClNmY3M1TTBkYlhJR2FCc25CQWRGbGgxS2NTNzBXQnAzbm8xTGFzeEEweHg3d20zSkdrWjBpTlRmTjhHWmhGaGkKR0xhcEh6WXordWNXMkw1dm9ZYkk2K1RtQ3M0dWkzRHVIMkpvOW5BZG9SYUhkcENWNnN0SGE2a1hiLzZXeWpXRAoxQlBpNWtsT1NpQXpOUFlIVE4wekRTd2drWSsxV0FVU01URy9Bai9UZjU3TGZzeWptaHNNOWtpZnNPbkZQZkZxCmlkQlZOT3dBWndEUS9lZzlKMGREQ05xMlJMTld3Mnh6STV4Rm1pQm1OOFZ4SjdNVmlrRSsrTndiMWhUc3FYNjUKeGEzZS9qaXN6V3piCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );
            expect(userData).toMatchSnapshot();
        });

        it("should return the correct user data for a basic ManagedNodeGroup", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                kubeletExtraArgs: "--max-pods=500",
            } as ManagedNodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });

        it("should support empty taint values", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                labels: {
                    ondemand: "true",
                },
                taints: {
                    mySpecialNodes: {
                        effect: "NoSchedule",
                    },
                },
            } as unknown as ManagedNodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });
    });

    describe("nodeadm", () => {
        it("should return the correct user data for a basic NodeGroup v1", () => {
            const userDataArgs: SelfManagedV1NodeUserDataArgs = {
                nodeGroupType: "self-managed-v1",
                awsRegion: "us-west-2",
                stackName: "example-cluster-1-98075617",
                extraUserData: undefined,
            } as SelfManagedV1NodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2023,
                {
                    name: "example-cluster-1-eksCluster-291f2c0",
                    apiServerEndpoint:
                        "https://71E3210BB45D2B930AAA878706C3E369.sk1.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJSDQzcy9uaGFBcmN3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEUzTlROYUZ3MHpOREEyTURFeE9USXlOVE5hTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUUNyQVlKb3p2YTRsY0NmQm9jY243N0FPSEdxeHdFWHkyczRBc3pJMGZ0WldIU1RKL0lnVlBLRHJKeEoKS01UQUZEaHJRZTBGdzFBVmxLdjZFWVE0M0x6UzhJZFBpSytEM2U3Tnh5M3JJdktVWUtPSVIxeE5ocUNYZzNJQwo0TWx4cS9VUzlqT2FYenM2dFRxYlY0NExESE94MXQydE96bWtTUjlvV1FBVm9yTk9KVVBMRnViSmpGQ0xsK09JCm9KMHJsWDRicFpkUzJhb2F4S2dLakFmN0N5aVV6czhZbHYza1F3b3ZJeElGUk9kSEdwaGJOejRzREZzdUE1VHQKVGE5cUdjbHdISDJ1WEdBa2dYTGRvZC91d1dIQ01TYk9PcVpOOVkwZEc5NzZkQ1F6a0NsUlBWc3FtTTgxNEkwNAp5MlFzYktpc0Q1dDI3V01BSHVjbmcwSVBSS3VEQWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJUazdWeE95ZzZDS3RHdlRLZGlPZkJpbzluYVp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ2JaMHBPcGovUQpuVXdjZm82M2ljTlArejFIRE14T1dueGdESGhpVlBLUVhHazNrSUVwai9QUlpyMXdGQkxLc0Nud1hnVkNuWWpzCldIMU9vUmZpaXZNR1ozaDAwQWhIdVNVUEVLc2dONjdsdldqbGR6LzlDeDVxMFJsRE9ucTRVWC94dWEvM1d0NVoKOUxhS2hpc2x0Z3FsZjJRbW5KNGo3QXB2bTVKM044ak9PdTQ0WXpGYjJ5RHZzMXVDQm9aZ1J2NzRIQVhTUW53MAp5OWNJU2RCNFJrZkEwZHEzaHRnWThoekxGN3JXZmNvRVFNUm1oY0JYRmVRVVo2ZjZmRlZ4eUFIOFBwbGFnMElQCjR3RE91UGRDMmZ5VGJKOFB4bjg4VkJhWnd3c3I2RUU0cXNUK1VaYnQ5ZHIwanZZb0xBTEdJaVpWRk9TRnVqL1cKWG9OR3VyT3Jra3E3Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );
            expect(userData).toMatchSnapshot();
        });

        it("should return the correct user data for a basic NodeGroup v2", () => {
            const userDataArgs: SelfManagedV2NodeUserDataArgs = {
                nodeGroupType: "self-managed-v2",
                stackName: "example",
                labels: {
                    ondemand: "true",
                },
            } as unknown as SelfManagedV2NodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2023,
                {
                    name: "example-nodegroup-iam-simple-eksCluster-7c35aee",
                    apiServerEndpoint:
                        "https://5BAAC422E1495BD874E1343C0FB41CE3.sk1.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQ3RpeGVHNWpiKzh3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEUzTWpoYUZ3MHpOREEyTURFeE9USXlNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURDYlJjUXlUWU1RNm1JdXRReHJseE0vUnlES0VpQTFiTDQ4YmFnV25USDVLZ1YvQmF0TnF4c2NITm8KbSsrR0puck1sVGJnTTkweEllM1RlaXR5KzNINDJnRnlwaTZCanZ1TnFjV1FabUpaUzFQb2RxZXNHdHdHeFhITAp4Tk4yb1ZOQXdDS2tvdjY5dkpvamZUYkJUdEZVVUVVSHhRVDRzTzE5L0xNdlZZcUcySkxQOFkxV1FVOVZYTzdYCnlHcGFtMjZUZ2l4L0lyem53dTg3QVVLTS9VSTV6RUtPU1NqM1pLNU56azlac05YQldSYmF4bTJBM2s4NUE1VWkKQXZBY0ZVaDlzcHAyWmt4UXhkTG1ndkh4L0RrZEVoRWVKNFJnbnVwZjI2QVl0aEVFZjRnY0U1S1NGWDFRZXhiSwp4aCtYRXZDU1lGU0ZXZDExNmdTOVQyRUdFT3FSQWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJTbnF2VU5aRmVaOFRqV0NJRy9UUzZ1M0Zjek9EQVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ3g0c1ZRTjdrOQpDbzNrUUI2ZnRLaHczSjNCSmc4bnZXL0QwVlMwOEp3cWNyblhzVXVzczBTTmQydkZvSGZKenNYZlhUV21LZ1dUClNmY3M1TTBkYlhJR2FCc25CQWRGbGgxS2NTNzBXQnAzbm8xTGFzeEEweHg3d20zSkdrWjBpTlRmTjhHWmhGaGkKR0xhcEh6WXordWNXMkw1dm9ZYkk2K1RtQ3M0dWkzRHVIMkpvOW5BZG9SYUhkcENWNnN0SGE2a1hiLzZXeWpXRAoxQlBpNWtsT1NpQXpOUFlIVE4wekRTd2drWSsxV0FVU01URy9Bai9UZjU3TGZzeWptaHNNOWtpZnNPbkZQZkZxCmlkQlZOT3dBWndEUS9lZzlKMGREQ05xMlJMTld3Mnh6STV4Rm1pQm1OOFZ4SjdNVmlrRSsrTndiMWhUc3FYNjUKeGEzZS9qaXN6V3piCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );
            expect(userData).toMatchSnapshot();
        });

        it("should return the correct user data for a basic ManagedNodeGroup", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                kubeletExtraArgs: "--max-pods=500",
            } as ManagedNodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2023,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });

        it("should support empty taint values", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                kubeletExtraArgs: "--max-pods=500",
                taints: {
                    mySpecialNodes: {
                        effect: "NoSchedule",
                    },
                },
            } as unknown as ManagedNodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2023,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });

        it("should throw an error if bootstrapExtraArgs are specified", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                kubeletExtraArgs: "--max-pods=500",
                bootstrapExtraArgs: "--enable-docker-bridge=true",
            } as ManagedNodeUserDataArgs;

            expect(() => {
                createUserData(
                    OperatingSystem.AL2023,
                    {
                        name: "example-managed-nodegroups-eksCluster-b27184c",
                        apiServerEndpoint:
                            "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                        certificateAuthority:
                            "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                        serviceCidr: "10.100.0.0/16",
                    },
                    userDataArgs,
                    undefined,
                );
            }).toThrow(
                "The 'bootstrapExtraArgs' argument is not supported for nodeadm based user data.",
            );
        });

        it("should allow adding extra nodeadm options for a NodeGroup", () => {
            const userDataArgs: SelfManagedV1NodeUserDataArgs = {
                nodeGroupType: "self-managed-v1",
                awsRegion: "us-west-2",
                stackName: "example-cluster-1-98075617",
                extraUserData: undefined,
                nodeadmExtraOptions: [
                    {
                        contentType: `text/x-shellscript; charset="us-ascii"`,
                        content: `#!/bin/bash\necho "Hello, World!"`,
                    },
                ],
            } as SelfManagedV1NodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2023,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });

        it("should allow adding extra nodeadm options for a NodeGroupV2", () => {
            const userDataArgs: SelfManagedV2NodeUserDataArgs = {
                nodeGroupType: "self-managed-v2",
                stackName: "example",
                nodeadmExtraOptions: [
                    {
                        contentType: `text/x-shellscript; charset="us-ascii"`,
                        content: `#!/bin/bash\necho "Hello, World!"`,
                    },
                ],
            } as unknown as SelfManagedV2NodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2023,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });

        it("should allow adding extra nodeadm options for a ManagedNodeGroup", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                kubeletExtraArgs: "--max-pods=500",
                nodeadmExtraOptions: [
                    {
                        contentType: `text/x-shellscript; charset="us-ascii"`,
                        content: `#!/bin/bash\necho "Hello, World!"`,
                    },
                ],
            } as ManagedNodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.AL2023,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });
    });

    describe("bottlerocket", () => {
        it("should return the correct user data for a basic NodeGroup v2", () => {
            const userDataArgs: SelfManagedV2NodeUserDataArgs = {
                nodeGroupType: "self-managed-v2",
                stackName: "example",
                labels: {
                    ondemand: "true",
                },
                taints: {
                    os: {
                        value: "bottlerocket",
                        effect: "NoSchedule",
                    },
                },
            } as unknown as SelfManagedV2NodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.Bottlerocket,
                {
                    name: "example-nodegroup-iam-simple-eksCluster-7c35aee",
                    apiServerEndpoint:
                        "https://5BAAC422E1495BD874E1343C0FB41CE3.sk1.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQ3RpeGVHNWpiKzh3RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEUzTWpoYUZ3MHpOREEyTURFeE9USXlNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURDYlJjUXlUWU1RNm1JdXRReHJseE0vUnlES0VpQTFiTDQ4YmFnV25USDVLZ1YvQmF0TnF4c2NITm8KbSsrR0puck1sVGJnTTkweEllM1RlaXR5KzNINDJnRnlwaTZCanZ1TnFjV1FabUpaUzFQb2RxZXNHdHdHeFhITAp4Tk4yb1ZOQXdDS2tvdjY5dkpvamZUYkJUdEZVVUVVSHhRVDRzTzE5L0xNdlZZcUcySkxQOFkxV1FVOVZYTzdYCnlHcGFtMjZUZ2l4L0lyem53dTg3QVVLTS9VSTV6RUtPU1NqM1pLNU56azlac05YQldSYmF4bTJBM2s4NUE1VWkKQXZBY0ZVaDlzcHAyWmt4UXhkTG1ndkh4L0RrZEVoRWVKNFJnbnVwZjI2QVl0aEVFZjRnY0U1S1NGWDFRZXhiSwp4aCtYRXZDU1lGU0ZXZDExNmdTOVQyRUdFT3FSQWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJTbnF2VU5aRmVaOFRqV0NJRy9UUzZ1M0Zjek9EQVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRQ3g0c1ZRTjdrOQpDbzNrUUI2ZnRLaHczSjNCSmc4bnZXL0QwVlMwOEp3cWNyblhzVXVzczBTTmQydkZvSGZKenNYZlhUV21LZ1dUClNmY3M1TTBkYlhJR2FCc25CQWRGbGgxS2NTNzBXQnAzbm8xTGFzeEEweHg3d20zSkdrWjBpTlRmTjhHWmhGaGkKR0xhcEh6WXordWNXMkw1dm9ZYkk2K1RtQ3M0dWkzRHVIMkpvOW5BZG9SYUhkcENWNnN0SGE2a1hiLzZXeWpXRAoxQlBpNWtsT1NpQXpOUFlIVE4wekRTd2drWSsxV0FVU01URy9Bai9UZjU3TGZzeWptaHNNOWtpZnNPbkZQZkZxCmlkQlZOT3dBWndEUS9lZzlKMGREQ05xMlJMTld3Mnh6STV4Rm1pQm1OOFZ4SjdNVmlrRSsrTndiMWhUc3FYNjUKeGEzZS9qaXN6V3piCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );
            expect(userData).toMatchSnapshot();
        });

        it("should return the correct user data for a basic ManagedNodeGroup", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                labels: {
                    ondemand: "true",
                },
                taints: {
                    os: {
                        value: "bottlerocket",
                        effect: "NoSchedule",
                    },
                },
            } as unknown as ManagedNodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.Bottlerocket,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });

        it("should support empty taint values", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                labels: {
                    ondemand: "true",
                },
                taints: {
                    mySpecialNodes: {
                        effect: "NoSchedule",
                    },
                },
            } as unknown as ManagedNodeUserDataArgs;
            const userData = createUserData(
                OperatingSystem.Bottlerocket,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });

        it("should throw an error if bootstrapExtraArgs are specified", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                bootstrapExtraArgs: "--enable-docker-bridge=true",
            } as ManagedNodeUserDataArgs;

            expect(() => {
                createUserData(
                    OperatingSystem.Bottlerocket,
                    {
                        name: "example-managed-nodegroups-eksCluster-b27184c",
                        apiServerEndpoint:
                            "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                        certificateAuthority:
                            "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                        serviceCidr: "10.100.0.0/16",
                    },
                    userDataArgs,
                    undefined,
                );
            }).toThrow("The 'bootstrapExtraArgs' argument is not supported with Bottlerocket.");
        });

        it("should allow overwriting base configuration", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                bottlerocketSettings: {
                    settings: {
                        kubernetes: {
                            "cluster-dns-ip": "127.0.0.1",
                        },
                    },
                },
            } as ManagedNodeUserDataArgs;

            const userData = createUserData(
                OperatingSystem.Bottlerocket,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });

        it("TOML formatting should be stable", () => {
            const userDataArgs1: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                bottlerocketSettings: {
                    settings: {
                        kubernetes: {
                            "eviction-hard": "15%",
                            "max-pods": 1500,
                        },
                        "host-containers": {
                            admin: {
                                enabled: true,
                            },
                        },
                        cloudformation: {
                            "stack-name": "example",
                        },
                    },
                },
            } as ManagedNodeUserDataArgs;

            // same as above, with keys in a different order
            const userDataArgs2: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                bottlerocketSettings: {
                    settings: {
                        cloudformation: {
                            "stack-name": "example",
                        },
                        "host-containers": {
                            admin: {
                                enabled: true,
                            },
                        },
                        kubernetes: {
                            "max-pods": 1500,
                            "eviction-hard": "15%",
                        },
                    },
                },
            } as ManagedNodeUserDataArgs;

            const create = (args: UserDataArgs) =>
                createUserData(
                    OperatingSystem.Bottlerocket,
                    {
                        name: "example-managed-nodegroups-eksCluster-b27184c",
                        apiServerEndpoint:
                            "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                        certificateAuthority:
                            "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                        serviceCidr: "10.100.0.0/16",
                    },
                    args,
                    undefined,
                );

            expect(create(userDataArgs1)).toEqual(create(userDataArgs2));
        });

        it("should allow adding additional configuration", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                bottlerocketSettings: {
                    settings: {
                        kubernetes: {
                            "max-pods": 1500,
                        },
                        "host-containers": {
                            admin: {
                                enabled: true,
                            },
                        },
                    },
                },
            } as ManagedNodeUserDataArgs;

            const userData = createUserData(
                OperatingSystem.Bottlerocket,
                {
                    name: "example-managed-nodegroups-eksCluster-b27184c",
                    apiServerEndpoint:
                        "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                    certificateAuthority:
                        "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                    serviceCidr: "10.100.0.0/16",
                },
                userDataArgs,
                undefined,
            );

            expect(userData).toMatchSnapshot();
        });

        it("should throw an error if kubeletExtraArgs are specified", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
                kubeletExtraArgs: "--max-pods=500",
            } as ManagedNodeUserDataArgs;

            expect(() => {
                createUserData(
                    OperatingSystem.Bottlerocket,
                    {
                        name: "example-managed-nodegroups-eksCluster-b27184c",
                        apiServerEndpoint:
                            "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                        certificateAuthority:
                            "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                        serviceCidr: "10.100.0.0/16",
                    },
                    userDataArgs,
                    undefined,
                );
            }).toThrow("The 'kubeletExtraArgs' argument is not supported with Bottlerocket.");
        });

        it("should throw an error if the serviceCidr is invalid", () => {
            const userDataArgs: ManagedNodeUserDataArgs = {
                nodeGroupType: "managed",
            } as ManagedNodeUserDataArgs;

            expect(() => {
                createUserData(
                    OperatingSystem.Bottlerocket,
                    {
                        name: "example-managed-nodegroups-eksCluster-b27184c",
                        apiServerEndpoint:
                            "https://CE21F68965F7FB2C00423B4483130C27.gr7.us-west-2.eks.amazonaws.com",
                        certificateAuthority:
                            "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURCVENDQWUyZ0F3SUJBZ0lJQWNzUG82b0t1S293RFFZSktvWklodmNOQVFFTEJRQXdGVEVUTUJFR0ExVUUKQXhNS2EzVmlaWEp1WlhSbGN6QWVGdzB5TkRBMk1ETXhPVEl3TWpoYUZ3MHpOREEyTURFeE9USTFNamhhTUJVeApFekFSQmdOVkJBTVRDbXQxWW1WeWJtVjBaWE13Z2dFaU1BMEdDU3FHU0liM0RRRUJBUVVBQTRJQkR3QXdnZ0VLCkFvSUJBUURqU0VRWFFkcjhmcDNOc2JYRG5RZTY1VGVGb1RkTUFiSVhzVjJua0t4V3dzdTM3dUJJSDBDSHV4b2gKYU9ZY1IzNmd5OVA2K0ZZSndhc3pyRGMvL0M1dGtsV0JLaGpySkRKbk5mcU0vUVBqOXRoK3dHWE4xeW5zR2VKbQpPVTZ4ek8yd290Uk1aYlBHTmx2UnlQQWtHMFZrM3Z0dEVINU8rcGl1NU44MkFnY3hWOGpWN3M0RHA3Qnd1L0xVCjFPRXRaN0RoVy9vWllPdTltRVJkK29CMkg4OS9ERDhZclBrejlvVlZCOEQycXp2UlRGUEhiR1VwaHNKK1VkZmcKNndhdjQySlRHS1RJRjc1OHRtbWZpL2lyaEJGMUlDcHI4bDJLVG9jNElKMWdVM0loS1lDOStHYlB2Y2VRK2ZwNgpTMlBTZStzVElGS2thY3JtRnNWM0hETEFvenJ6QWdNQkFBR2pXVEJYTUE0R0ExVWREd0VCL3dRRUF3SUNwREFQCkJnTlZIUk1CQWY4RUJUQURBUUgvTUIwR0ExVWREZ1FXQkJSZWpnZC84THN3eHpDTVpGQWRsUUdvM1lYdnp6QVYKQmdOVkhSRUVEakFNZ2dwcmRXSmxjbTVsZEdWek1BMEdDU3FHU0liM0RRRUJDd1VBQTRJQkFRRGE4TU5VQnNvbQpWYmx2dzRaaTYxaUxFZEVKTkxkMG5TNnIxQTVidjZLZHFjd0VNN0VDVldyTlB3TFVWYklaOTEzeEMxNnN1M2szCnZkTWllWEhkSDNPZTdkTzZ3RXNxbzdyTDdYc0FUblRlZEQ4OFRyVU13TjFVcEY1VHRjMUlRaHVaM1pnUnJmVUUKV09RZnFrcU8waVljNUl0ZUZvV1Q1ZHlseHd0eWpwMDhCZmFNVGZvc2cvYW1BUnhvRnptVGV6dkRSTnlEVllwdwovVWRFR0FmT0lBY3ZJNy9oNmhTay8wMkFTOGRXSm0xZWlMZ3p0czhCUGZJME1KaFFjdjlhL1dZc3I4aDREaTFpCmNsNlhnb0hWZ3VzZ1UwQVQ3SHdqelQ4WFN0N0xzb08rMFlTUTZOck9wZTlwL283N0FwaGFEQ3hIZHhJZlF1LysKRGttNUJhR05VaWFxCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K",
                        serviceCidr: "NOT_A_CIDR",
                    },
                    userDataArgs,
                    undefined,
                );
            }).toThrow(
                "Couldn't calculate the cluster dns ip based on the service CIDR. ipaddr: the address has neither IPv6 nor IPv4 CIDR format",
            );
        });
    });
});

describe("getClusterDnsIp", () => {
    test.each([
        ["10.100.0.0/16", "10.100.0.10"],
        ["172.20.0.0/16", "172.20.0.10"],
        ["192.168.0.0/24", "192.168.0.10"],
        ["192.0.2.0/24", "192.0.2.10"],
        ["203.0.113.0/24", "203.0.113.10"],
        ["10.0.0.0/8", "10.0.0.10"],
        ["172.16.0.0/12", "172.16.0.10"],
        ["198.51.100.0/24", "198.51.100.10"],
        ["192.88.99.0/24", "192.88.99.10"],
        ["169.254.0.0/16", "169.254.0.10"],
        ["11.0.0.0/24", "11.0.0.10"],
        ["1.1.1.0/24", "1.1.1.10"],
        ["8.8.8.0/24", "8.8.8.10"],
        ["203.0.113.100/27", "203.0.113.106"],
        ["2001:db8::/32", "2001:db8::a"],
        ["fd00::/64", "fd00::a"],
        ["2001:db8:85a3::/64", "2001:db8:85a3::a"],
        ["2001:db8:1234::/48", "2001:db8:1234::a"],
        ["2001:0db8:abcd::/48", "2001:db8:abcd::a"],
        ["fd12:3456:789a::/64", "fd12:3456:789a::a"],
        ["2001:470:ee34::/48", "2001:470:ee34::a"],
        ["2607:f8b0:4005::/48", "2607:f8b0:4005::a"],
        ["2001:0db8:abcd:0012::/64", "2001:db8:abcd:12::a"],
        ["fe80::/64", "fe80::a"],
        ["fdff:ffff:ffff::/48", "fdff:ffff:ffff::a"],
        ["2001:db8:1234:5678::/64", "2001:db8:1234:5678::a"],
    ])("Service CIDR %s should yield cluster dns IP %s", (serviceCidr, expected) => {
        expect(getClusterDnsIp(serviceCidr, undefined)).toBe(expected);
    });

    test.each([
        ["NOT_A_CIDR"],
        ["300.0.0.0/24"],
        ["192.168.0.0/33"],
        ["::1/129"],
        ["192.168.0.0"],
        ["10.0.0.0/-1"],
        ["10.0.0.0/abc"],
    ])("Service CIDR '%s' should throw error", (serviceCidr) => {
        expect(() => getClusterDnsIp(serviceCidr, undefined)).toThrow(
            "Couldn't calculate the cluster dns ip based on the service CIDR. ipaddr: the address has neither IPv6 nor IPv4 CIDR format",
        );
    });
});
