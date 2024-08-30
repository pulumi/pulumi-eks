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

import { OperatingSystem } from "./ami";
import {
    createUserData,
    ManagedNodeUserDataArgs,
    requiresCustomUserData,
    SelfManagedV1NodeUserDataArgs,
    SelfManagedV2NodeUserDataArgs,
} from "./userdata";

describe("requiresCustomUserData", () => {
    it("should return true if both bootstrapExtraArgs or kubeletExtraArgs is defined", () => {
        const args = {
            bootstrapExtraArgs: "--arg1 value1",
            kubeletExtraArgs: "--arg2 value2",
        };
        const result = requiresCustomUserData(args);
        expect(result).toBe(true);
    });

    it("should return false if both bootstrapExtraArgs and kubeletExtraArgs are undefined", () => {
        const args = {
            bootstrapExtraArgs: undefined,
            kubeletExtraArgs: undefined,
        };
        const result = requiresCustomUserData(args);
        expect(result).toBe(false);
    });

    it("should return true if bootstrapExtraArgs is defined and kubeletExtraArgs is undefined", () => {
        const args = {
            bootstrapExtraArgs: "--arg1 value1",
            kubeletExtraArgs: undefined,
        };
        const result = requiresCustomUserData(args);
        expect(result).toBe(true);
    });

    it("should return true if kubeletExtraArgs is defined and bootstrapExtraArgs is undefined", () => {
        const args = {
            bootstrapExtraArgs: undefined,
            kubeletExtraArgs: "--arg2 value2",
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
                },
                userDataArgs,
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
                },
                userDataArgs,
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
                },
                userDataArgs,
            );

            expect(userData).toMatchSnapshot();
        });
    });
});
