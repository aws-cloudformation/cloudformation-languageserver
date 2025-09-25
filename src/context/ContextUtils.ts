export function isCondition(text: string) {
    const condition = 'Condition';
    return text === condition || text === `!${condition}` || text === `Fn::${condition}`;
}
