import { getLogger } from "@deltachat-desktop/shared/logger";

const log = getLogger("render/utils/DeploymentService");

export interface MindData {
    profile: any;
    stats: any;
    mindstream: any[];
    gallery: any[];
}

export interface DeploymentAdapter {
    deploy(data: MindData): Promise<string>;
}

export class MockDeploymentAdapter implements DeploymentAdapter {
    async deploy(data: MindData): Promise<string> {
        log.info('[MockDeploy] Deploying to Digital Garden...', { itemCount: data.mindstream.length });

        // Simulate network latency
        await new Promise(resolve => setTimeout(resolve, 1500));

        log.info('[MockDeploy] Deployment successful! Data:', JSON.stringify(data, null, 2).slice(0, 200) + '...');

        return "https://mind.deeptreeecho.ai"; // Simulated URL
    }
}

export class DeploymentService {
    private static instance: DeploymentService;
    private adapter: DeploymentAdapter;

    private constructor() {
        this.adapter = new MockDeploymentAdapter();
    }

    public static getInstance(): DeploymentService {
        if (!DeploymentService.instance) {
            DeploymentService.instance = new DeploymentService();
        }
        return DeploymentService.instance;
    }

    public setAdapter(adapter: DeploymentAdapter) {
        this.adapter = adapter;
    }

    public async deploy(data: MindData): Promise<string> {
        return this.adapter.deploy(data);
    }
}
