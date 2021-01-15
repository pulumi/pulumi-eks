using System.Collections.Immutable;
using Pulumi;

class Vpc : ComponentResource
{
    [Output("vpcId")]
    public Output<string> VpcId { get; private set; } = null!;

    [Output("publicSubnetIds")]
    public Output<ImmutableArray<string>> PublicSubnetIds { get; private set; } = null!;

    [Output("privateSubnetIds")]
    public Output<ImmutableArray<string>> PrivateSubnetIds { get; private set; } = null!;

    public Vpc(string name, ComponentResourceOptions? options = null)
        : base("testvpc:index:Vpc", name, ResourceArgs.Empty, options, remote: true)
    {
    }
}
