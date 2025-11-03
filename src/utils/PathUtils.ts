import { IntrinsicFunction, IntrinsicsSet } from '../context/ContextType';

/**
 * Convert CloudFormation template path to JSON Pointer path format
 *
 * This function transforms template paths that contain numerical array indices
 * into normalized JSON Pointer paths that use wildcards (*) for array navigation.
 * It also handles CloudFormation intrinsic functions by stopping path conversion
 * at function boundaries.
 *
 * @param templatePath - Template path array with property names and numerical indices
 * @returns Absolute JSON Pointer path string (e.g., "/properties/BucketName")
 */
export function templatePathToJsonPointerPath(templatePath: (string | number)[]): string {
    const segments: string[] = ['properties'];

    for (let i = 0; i < templatePath.length; i++) {
        const segment = templatePath[i];

        if (typeof segment === 'number') {
            // Convert any number to wildcard
            segments.push('*');
        } else if (segment === (IntrinsicFunction.If as string)) {
            // Handle Fn::If specially
            const nextSegment = templatePath[i + 1];
            if (typeof nextSegment === 'number') {
                if (nextSegment === 0) {
                    // Fn::If/0 is condition name - stop processing here
                    break;
                } else if (nextSegment === 1 || nextSegment === 2) {
                    // Fn::If/1 and Fn::If/2 are true/false values - skip both Fn::If and the index
                    i++; // Skip the index segment
                    continue; // Continue with remaining path
                }
            }
            // If not followed by valid index, stop at the intrinsic function
            break;
        } else if (IntrinsicsSet.has(segment)) {
            // For all other intrinsic functions, stop at the function and return path up to here
            break;
        } else {
            // Regular property name or existing wildcard
            segments.push(segment);
        }
    }

    return '/' + segments.join('/');
}
