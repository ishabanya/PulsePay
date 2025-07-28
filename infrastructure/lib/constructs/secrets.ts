import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class Secrets extends Construct {
  public readonly firebaseSecret: secretsmanager.Secret;
  public readonly stripeSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.firebaseSecret = new secretsmanager.Secret(this, 'FirebaseSecret', {
      secretName: 'payment-app/firebase',
      description: 'Firebase service account credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          projectId: 'your-firebase-project-id',
          clientEmail: 'your-service-account@your-project.iam.gserviceaccount.com'
        }),
        generateStringKey: 'privateKey',
        excludeCharacters: '"@/\\\'',
      },
    });

    this.stripeSecret = new secretsmanager.Secret(this, 'StripeSecret', {
      secretName: 'payment-app/stripe',
      description: 'Stripe API keys',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ 
          secretKey: 'sk_test_your_stripe_secret_key'
        }),
        generateStringKey: 'webhookSecret',
        excludeCharacters: '"@/\\\'',
      },
    });

    new cdk.CfnOutput(this, 'FirebaseSecretArn', {
      value: this.firebaseSecret.secretArn,
      description: 'Firebase Secret ARN - Update this with your actual Firebase credentials',
    });

    new cdk.CfnOutput(this, 'StripeSecretArn', {
      value: this.stripeSecret.secretArn,
      description: 'Stripe Secret ARN - Update this with your actual Stripe keys',
    });
  }
}