import { CodeLens, Position, Range } from 'vscode-languageserver';

const STACK_ACTION_TITLES = {
    VALIDATE_DEPLOYMENT: 'Validate Deployment',
    DEPLOY: 'Deploy Template',
} as const;

const STACK_ACTION_COMMANDS = {
    VALIDATE_DEPLOYMENT: 'aws.cloudformation.api.validateDeployment',
    DEPLOY: 'aws.cloudformation.api.deployTemplate',
} as const;

export function getStackActionsCodeLenses(uri: string): CodeLens[] {
    const range = Range.create(Position.create(0, 0), Position.create(0, 0));

    return [
        {
            range,
            command: {
                title: STACK_ACTION_TITLES.VALIDATE_DEPLOYMENT,
                command: STACK_ACTION_COMMANDS.VALIDATE_DEPLOYMENT,
                arguments: [uri],
            },
        },
        {
            range,
            command: {
                title: STACK_ACTION_TITLES.DEPLOY,
                command: STACK_ACTION_COMMANDS.DEPLOY,
                arguments: [uri],
            },
        },
    ];
}
