import { isGravitonInstance } from "./nodegroup";

const gravitonInstances = [
    "c6g.12xlarge",
    "c6g.16xlarge",
    "c6g.large",
    "c6g.medium",
    "c6g.metal",
    "c6g.xlarge",
    "c6gd.12xlarge",
    "c6gd.16xlarge",
    "c6gd.2xlarge",
    "c6gd.4xlarge",
    "c6gd.8xlarge",
    "c6gd.large",
    "c6gd.medium",
    "c6gd.metal",
    "c6gd.xlarge",
    "c6gn.12xlarge",
    "c6gn.16xlarge",
    "c6gn.2xlarge",
    "c6gn.4xlarge",
    "c6gn.8xlarge",
    "c6gn.large",
    "c6gn.medium",
    "c6gn.xlarge",
    "c7gn.large",
    "c7gn.medium",
    "c7gn.xlarge",
    "g5g.8xlarge",
    "g5g.metal",
    "g5g.xlarge",
    "hpc7g.16xlarge",
    "hpc7g.4xlarge",
    "hpc7g.8xlarge",
    "i4g.16xlarge",
    "i4g.xlarge",
    "im4gn.16xlarge",
    "is4gen.2xlarge",
    "m6g.12xlarge",
    "m6gd.medium",
    "m6gd.metal",
    "m6gd.xlarge",
    "m7g-flex.16xlarge",
    "m7g.medium",
    "m7g.metal",
    "t4g.2xlarge",
    "t4g.large",
    "t4g.medium",
    "t4g.micro",
    "t4g.nano",
    "t4g.small",
    "t4g.xlarge",
    "x2gd.large",
];

const nonGravitonInstances = [
    " a1.metal",
    " c5.metal",
    " g4dn.metal",
    " i3.metal",
    " r5.metal",
    "a1.2xlarge",
    "c5.xlarge",
    "c5a.12xlarge",
    "c5ad.xlarge",
    "c5n.large",
    "c5n.metal",
    "c5n.xlarge",
    "c6a.xlarge",
    "c6i.16xlarge",
    "c6id.xlarge",
    "c7a.metal-48xl",
    "c7a.xlarge",
    "c7i.metal-24xl",
    "c7i.metal-48xl",
    "d3en.12xlarge",
    "g2.2xlarge",
    "g2.8xlarge",
    "g3.16xlarge",
    "g3.4xlarge",
    "g3.8xlarge",
    "g4dn.xlarge",
    "g5.12xlarge",
    "g5.16xlarge",
    "g5.24xlarge",
    "g5.2xlarge",
    "g5.48xlarge",
    "g5.4xlarge",
    "g5.8xlarge",
    "g5.xlarge",
    "h1.16xlarge",
    "h1.2xlarge",
    "h1.4xlarge",
    "h1.8xlarge",
    "hpc6a.48xlarge",
    "hpc6id.32xlarge",
    "i2.2xlarge",
    "i2.4xlarge",
    "i2.8xlarge",
    "i2.xlarge",
    "i3.16xlarge",
    "i3.2xlarge",
    "i3.4xlarge",
    "i3.8xlarge",
    "i3.large",
    "i3.metal",
    "i3.xlarge",
    "i3en.12xlarge",
    "inf1.6xlarge",
    "inf1.xlarge",
    "inf2.24xlarge",
    "inf2.48xlarge",
    "m4.4xlarge",
    "m4.large",
    "m4.xlarge",
    "m5.12xlarge",
    "m5.16xlarge",
    "m5.24xlarge",
    "m5.2xlarge",
    "m5.4xlarge",
    "m5.8xlarge",
    "m5.large",
    "m5.metal",
    "m5.xlarge",
    "m5a.12xlarge",
    "m5a.16xlarge",
    "m5a.24xlarge",
    "m5a.2xlarge",
    "m5a.4xlarge",
    "m5a.8xlarge",
    "m5a.large",
    "m5a.xlarge",
    "m5ad.12xlarge",
    "m5ad.16xlarge",
    "m5ad.24xlarge",
    "m5ad.2xlarge",
    "m5ad.4xlarge",
    "m5ad.8xlarge",
    "m5ad.large",
    "m5ad.xlarge",
    "m5d.12xlarge",
    "m5d.16xlarge",
    "m5d.24xlarge",
    "m5d.2xlarge",
    "m5d.4xlarge",
    "m5d.8xlarge",
    "m5d.large",
    "m5d.metal",
    "m5d.xlarge",
    "m5dn.12xlarge",
    "m5dn.16xlarge",
    "m5dn.24xlarge",
    "m5dn.2xlarge",
    "m5dn.4xlarge",
    "m5dn.8xlarge",
    "m5dn.large",
    "m5dn.metal",
    "m5dn.xlarge",
    "m5n.12xlarge",
    "m5n.16xlarge",
    "m5n.24xlarge",
    "m5n.2xlarge",
    "m5n.4xlarge",
    "m5n.8xlarge",
    "m5n.large",
    "m5n.metal",
    "m5n.xlarge",
    "m5zn.12xlarge",
    "m5zn.2xlarge",
    "m5zn.3xlarge",
    "m5zn.6xlarge",
    "m5zn.large",
    "m5zn.metal",
    "m5zn.xlarge",
    "m6a.12xlarge",
    "m6a.16xlarge",
    "m6a.24xlarge",
    "m6a.2xlarge",
    "m6a.32xlarge",
    "m6a.48xlarge",
    "m6a.4xlarge",
    "m6a.8xlarge",
    "m6a.large",
    "m6a.metal",
    "m6a.xlarge",
    "m6i.12xlarge",
    "m6i.16xlarge",
    "m6i.24xlarge",
    "m6i.2xlarge",
    "m6i.32xlarge",
    "m6i.4xlarge",
    "m6i.8xlarge",
    "m6i.large",
    "m6i.metal",
    "m6i.xlarge",
    "m6id.12xlarge",
    "m6id.16xlarge",
    "m6id.24xlarge",
    "m6id.2xlarge",
    "m6id.32xlarge",
    "m6id.4xlarge",
    "m6id.8xlarge",
    "m6id.large",
    "m6id.metal",
    "m6id.xlarge",
    "m6idn.12xlarge",
    "m6idn.16xlarge",
    "m6idn.24xlarge",
    "m6idn.2xlarge",
    "m6idn.32xlarge",
    "m6idn.4xlarge",
    "m6idn.8xlarge",
    "m6idn.large",
    "m6idn.metal",
    "m6idn.xlarge",
    "m6in.12xlarge",
    "m6in.16xlarge",
    "m6in.24xlarge",
    "m6in.2xlarge",
    "m6in.32xlarge",
    "m6in.4xlarge",
    "m6in.8xlarge",
    "m6in.large",
    "m6in.metal",
    "m6in.xlarge",
    "m7a.12xlarge",
    "m7a.16xlarge",
    "m7a.24xlarge",
    "m7a.2xlarge",
    "m7a.32xlarge",
    "m7a.48xlarge",
    "m7a.4xlarge",
    "m7a.8xlarge",
    "m7a.large",
    "m7a.medium",
    "m7a.metal-48xl",
    "m7a.xlarge",
    "m7i-flex.2xlarge",
    "m7i-flex.4xlarge",
    "m7i.xlarge",
    "mac1.metal",
    "mac2-m2.metal",
    "mac2-m2pro.metal",
    "mac2.metal",
    "p3dn.24xlarge",
    "p4d.24xlarge",
    "r5dn.24xlarge",
    "r7iz.metal-32xl",
    "r7iz.xlarge",
    "t1.micro",
    "t2.2xlarge",
    "t2.large",
    "t2.medium",
    "t2.micro",
    "t2.nano",
    "t2.small",
    "t2.xlarge",
    "t3.2xlarge",
    "t3.large",
    "t3.medium",
    "t3.micro",
    "t3.nano",
    "t3.small",
    "t3.xlarge",
    "t3a.2xlarge",
    "t3a.large",
    "t3a.medium",
    "t3a.micro",
    "t3a.nano",
    "t3a.small",
    "t3a.xlarge",
    "trn1n.32xlarge",
    "u-12tb1.112xlarge",
    "u-12tb1.metal",
    "u-18tb1.112xlarge",
    "u-18tb1.metal",
    "u-24tb1.112xlarge",
    "u-24tb1.metal",
    "u-3tb1.56xlarge",
    "u-6tb1.112xlarge",
    "u-6tb1.56xlarge",
    "u-6tb1.metal",
    "u-9tb1.112xlarge",
    "u-9tb1.metal",
];

describe("isGravitonInstance", () => {
    gravitonInstances.forEach((instanceType) => {
        test(`${instanceType} should return true for a Graviton instance`, () => {
            expect(isGravitonInstance(instanceType)).toBe(true);
        });
    });

    nonGravitonInstances.forEach((instanceType) => {
        test(`${instanceType} should return false for non-Graviton instance`, () => {
            expect(isGravitonInstance(instanceType)).toBe(false);
        });
    });
});
