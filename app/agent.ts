import { createDeepAgent } from 'deepagents';

export class Agent {
    private agent: any
    constructor(model: any) {
        this.agent = createDeepAgent({
            model,
            systemPrompt: ''
        })
    }
}