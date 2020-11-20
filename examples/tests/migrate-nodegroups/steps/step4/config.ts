import * as pulumi from "@pulumi/pulumi";

interface Config {
    createNodeGroup2xlarge: pulumi.Input<boolean>;
    desiredCapacity2xlarge: pulumi.Input<number>;

    createNodeGroup4xlarge: pulumi.Input<boolean>;
    desiredCapacity4xlarge: pulumi.Input<number>;

    deployWorkload: pulumi.Input<boolean>;
    nginxNodeSelectorTermValues: pulumi.Input<string>[];
}

// Scale down the 2xlarge node group to a desired capacity of 0 workers.
export const config: Config = {
    createNodeGroup2xlarge: true,
    desiredCapacity2xlarge: 0,
    createNodeGroup4xlarge: true,
    desiredCapacity4xlarge: 5,
    deployWorkload: false,
    nginxNodeSelectorTermValues: [],
};
