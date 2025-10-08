import { CodeLens, Position, Range } from 'vscode-languageserver';

const STACK_ACTION_TITLES = {
    DRY_RUN: 'Dry Run Deployment',
    DEPLOY: 'Deploy',
} as const;

const STACK_ACTION_COMMANDS = {
    VALIDATE: 'aws.cloudformation.api.validateTemplate',
    DEPLOY: 'aws.cloudformation.api.deployTemplate',
} as const;

export function getStackActionsCodeLenses(uri: string): CodeLens[] {
    const range = Range.create(Position.create(0, 0), Position.create(0, 0));

    return [
        {
            range,
            command: {
                title: STACK_ACTION_TITLES.DRY_RUN,
                command: STACK_ACTION_COMMANDS.VALIDATE,
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
