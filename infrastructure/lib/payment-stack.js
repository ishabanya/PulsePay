"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStack = void 0;
const cdk = require("aws-cdk-lib");
const network_1 = require("./constructs/network");
const frontend_1 = require("./constructs/frontend");
const backend_1 = require("./constructs/backend");
const secrets_1 = require("./constructs/secrets");
class PaymentStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment } = props;
        this.secrets = new secrets_1.Secrets(this, 'Secrets');
        this.network = new network_1.Network(this, 'Network', {
            cidr: '10.0.0.0/16',
            maxAzs: 2,
        });
        this.frontend = new frontend_1.Frontend(this, 'Frontend');
        this.backend = new backend_1.Backend(this, 'Backend', {
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
exports.PaymentStack = PaymentStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF5bWVudC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInBheW1lbnQtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLGtEQUErQztBQUMvQyxvREFBaUQ7QUFDakQsa0RBQStDO0FBQy9DLGtEQUErQztBQU0vQyxNQUFhLFlBQWEsU0FBUSxHQUFHLENBQUMsS0FBSztJQU16QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdCO1FBQ2hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFOUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGlCQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRTVDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxpQkFBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDMUMsSUFBSSxFQUFFLGFBQWE7WUFDbkIsTUFBTSxFQUFFLENBQUM7U0FDVixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksbUJBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFL0MsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLGlCQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtZQUMxQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHO1lBQ3JCLE9BQU8sRUFBRTtnQkFDUCxRQUFRLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjO2dCQUNyQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZO2FBQ2xDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNsRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQy9DLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFL0MsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLFdBQVcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUU7WUFDNUMsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsV0FBVyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixFQUFFO1lBQ3BELFdBQVcsRUFBRSxpQkFBaUI7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLFdBQVc7WUFDbEIsV0FBVyxFQUFFLHdCQUF3QjtTQUN0QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEvQ0Qsb0NBK0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0IHsgTmV0d29yayB9IGZyb20gJy4vY29uc3RydWN0cy9uZXR3b3JrJztcbmltcG9ydCB7IEZyb250ZW5kIH0gZnJvbSAnLi9jb25zdHJ1Y3RzL2Zyb250ZW5kJztcbmltcG9ydCB7IEJhY2tlbmQgfSBmcm9tICcuL2NvbnN0cnVjdHMvYmFja2VuZCc7XG5pbXBvcnQgeyBTZWNyZXRzIH0gZnJvbSAnLi9jb25zdHJ1Y3RzL3NlY3JldHMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBheW1lbnRTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogJ2RldmVsb3BtZW50JyB8ICdzdGFnaW5nJyB8ICdwcm9kdWN0aW9uJztcbn1cblxuZXhwb3J0IGNsYXNzIFBheW1lbnRTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBuZXR3b3JrOiBOZXR3b3JrO1xuICBwdWJsaWMgcmVhZG9ubHkgZnJvbnRlbmQ6IEZyb250ZW5kO1xuICBwdWJsaWMgcmVhZG9ubHkgYmFja2VuZDogQmFja2VuZDtcbiAgcHVibGljIHJlYWRvbmx5IHNlY3JldHM6IFNlY3JldHM7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFBheW1lbnRTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCB7IGVudmlyb25tZW50IH0gPSBwcm9wcztcblxuICAgIHRoaXMuc2VjcmV0cyA9IG5ldyBTZWNyZXRzKHRoaXMsICdTZWNyZXRzJyk7XG5cbiAgICB0aGlzLm5ldHdvcmsgPSBuZXcgTmV0d29yayh0aGlzLCAnTmV0d29yaycsIHtcbiAgICAgIGNpZHI6ICcxMC4wLjAuMC8xNicsXG4gICAgICBtYXhBenM6IDIsXG4gICAgfSk7XG5cbiAgICB0aGlzLmZyb250ZW5kID0gbmV3IEZyb250ZW5kKHRoaXMsICdGcm9udGVuZCcpO1xuXG4gICAgdGhpcy5iYWNrZW5kID0gbmV3IEJhY2tlbmQodGhpcywgJ0JhY2tlbmQnLCB7XG4gICAgICB2cGM6IHRoaXMubmV0d29yay52cGMsXG4gICAgICBzZWNyZXRzOiB7XG4gICAgICAgIGZpcmViYXNlOiB0aGlzLnNlY3JldHMuZmlyZWJhc2VTZWNyZXQsXG4gICAgICAgIHN0cmlwZTogdGhpcy5zZWNyZXRzLnN0cmlwZVNlY3JldCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnUHJvamVjdCcsICdQYXltZW50QXBwJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdTdGFjaycsICdQYXltZW50U3RhY2snKTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGcm9udGVuZFVSTCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke3RoaXMuZnJvbnRlbmQuZG9tYWluTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdGcm9udGVuZCBBcHBsaWNhdGlvbiBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JhY2tlbmRVUkwnLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHt0aGlzLmJhY2tlbmQubG9hZEJhbGFuY2VyRG5zTmFtZX1gLFxuICAgICAgZGVzY3JpcHRpb246ICdCYWNrZW5kIEFQSSBVUkwnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Vudmlyb25tZW50Jywge1xuICAgICAgdmFsdWU6IGVudmlyb25tZW50LFxuICAgICAgZGVzY3JpcHRpb246ICdEZXBsb3ltZW50IEVudmlyb25tZW50JyxcbiAgICB9KTtcbiAgfVxufSJdfQ==