"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Secrets = void 0;
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
class Secrets extends constructs_1.Construct {
    constructor(scope, id) {
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
exports.Secrets = Secrets;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjcmV0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNlY3JldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsaUVBQWlFO0FBQ2pFLG1DQUFtQztBQUNuQywyQ0FBdUM7QUFFdkMsTUFBYSxPQUFRLFNBQVEsc0JBQVM7SUFJcEMsWUFBWSxLQUFnQixFQUFFLEVBQVU7UUFDdEMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDdEUsVUFBVSxFQUFFLHNCQUFzQjtZQUNsQyxXQUFXLEVBQUUsc0NBQXNDO1lBQ25ELG9CQUFvQixFQUFFO2dCQUNwQixvQkFBb0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQyxTQUFTLEVBQUUsMEJBQTBCO29CQUNyQyxXQUFXLEVBQUUsMkRBQTJEO2lCQUN6RSxDQUFDO2dCQUNGLGlCQUFpQixFQUFFLFlBQVk7Z0JBQy9CLGlCQUFpQixFQUFFLFNBQVM7YUFDN0I7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ2xFLFVBQVUsRUFBRSxvQkFBb0I7WUFDaEMsV0FBVyxFQUFFLGlCQUFpQjtZQUM5QixvQkFBb0IsRUFBRTtnQkFDcEIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkMsU0FBUyxFQUFFLGdDQUFnQztpQkFDNUMsQ0FBQztnQkFDRixpQkFBaUIsRUFBRSxlQUFlO2dCQUNsQyxpQkFBaUIsRUFBRSxTQUFTO2FBQzdCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTO1lBQ3BDLFdBQVcsRUFBRSx5RUFBeUU7U0FDdkYsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN6QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTO1lBQ2xDLFdBQVcsRUFBRSw4REFBOEQ7U0FDNUUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBMUNELDBCQTBDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBjbGFzcyBTZWNyZXRzIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGZpcmViYXNlU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XG4gIHB1YmxpYyByZWFkb25seSBzdHJpcGVTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIHRoaXMuZmlyZWJhc2VTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdGaXJlYmFzZVNlY3JldCcsIHtcbiAgICAgIHNlY3JldE5hbWU6ICdwYXltZW50LWFwcC9maXJlYmFzZScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0ZpcmViYXNlIHNlcnZpY2UgYWNjb3VudCBjcmVkZW50aWFscycsXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICBwcm9qZWN0SWQ6ICd5b3VyLWZpcmViYXNlLXByb2plY3QtaWQnLFxuICAgICAgICAgIGNsaWVudEVtYWlsOiAneW91ci1zZXJ2aWNlLWFjY291bnRAeW91ci1wcm9qZWN0LmlhbS5nc2VydmljZWFjY291bnQuY29tJ1xuICAgICAgICB9KSxcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdwcml2YXRlS2V5JyxcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXFxcJycsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5zdHJpcGVTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdTdHJpcGVTZWNyZXQnLCB7XG4gICAgICBzZWNyZXROYW1lOiAncGF5bWVudC1hcHAvc3RyaXBlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU3RyaXBlIEFQSSBrZXlzJyxcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHNlY3JldEtleTogJ3NrX3Rlc3RfeW91cl9zdHJpcGVfc2VjcmV0X2tleSdcbiAgICAgICAgfSksXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAnd2ViaG9va1NlY3JldCcsXG4gICAgICAgIGV4Y2x1ZGVDaGFyYWN0ZXJzOiAnXCJAL1xcXFxcXCcnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGaXJlYmFzZVNlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmZpcmViYXNlU2VjcmV0LnNlY3JldEFybixcbiAgICAgIGRlc2NyaXB0aW9uOiAnRmlyZWJhc2UgU2VjcmV0IEFSTiAtIFVwZGF0ZSB0aGlzIHdpdGggeW91ciBhY3R1YWwgRmlyZWJhc2UgY3JlZGVudGlhbHMnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1N0cmlwZVNlY3JldEFybicsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnN0cmlwZVNlY3JldC5zZWNyZXRBcm4sXG4gICAgICBkZXNjcmlwdGlvbjogJ1N0cmlwZSBTZWNyZXQgQVJOIC0gVXBkYXRlIHRoaXMgd2l0aCB5b3VyIGFjdHVhbCBTdHJpcGUga2V5cycsXG4gICAgfSk7XG4gIH1cbn0iXX0=