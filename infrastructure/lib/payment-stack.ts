import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Network } from './constructs/network';
import { Frontend } from './constructs/frontend';
import { Backend } from './constructs/backend';
import { Secrets } from './constructs/secrets';

export interface PaymentStackProps extends cdk.StackProps {
  environment: 'development' | 'staging' | 'production';
}

export class PaymentStack extends cdk.Stack {
  public readonly network: Network;
  public readonly frontend: Frontend;
  public readonly backend: Backend;
  public readonly secrets: Secrets;

  constructor(scope: Construct, id: string, props: PaymentStackProps) {
    super(scope, id, props);

    const { environment } = props;

    this.secrets = new Secrets(this, 'Secrets');

    this.network = new Network(this, 'Network', {
      cidr: '10.0.0.0/16',
      maxAzs: 2,
    });

    this.frontend = new Frontend(this, 'Frontend');

    this.backend = new Backend(this, 'Backend', {
      vpc: this.network.vpc,
      secrets: {
        firebase: this.secrets.firebaseSecret,
        stripe: this.secrets.stripeSecret,
      },
    });

    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('Project', 'PaymentApp');
    cdk.Tags.of(this).add('Stack', 'PaymentStack');

    new cdk.CfnOutput(this, 'FrontendURL', {
      value: `https://${this.frontend.domainName}`,
      description: 'Frontend Application URL',
    });

    new cdk.CfnOutput(this, 'BackendURL', {
      value: `https://${this.backend.loadBalancerDnsName}`,
      description: 'Backend API URL',
    });

    new cdk.CfnOutput(this, 'Environment', {
      value: environment,
      description: 'Deployment Environment',
    });
  }
}