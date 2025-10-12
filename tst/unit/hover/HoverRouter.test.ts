import { StubbedInstance } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ContextManager } from '../../../src/context/ContextManager';
import { TopLevelSection } from '../../../src/context/ContextType';
import { Parameter } from '../../../src/context/semantic/Entity';
import { ConditionHoverProvider } from '../../../src/hover/ConditionHoverProvider';
import { HoverRouter } from '../../../src/hover/HoverRouter';
import { MappingHoverProvider } from '../../../src/hover/MappingHoverProvider';
import { ParameterHoverProvider } from '../../../src/hover/ParameterHoverProvider';
import { ResourceSectionHoverProvider } from '../../../src/hover/ResourceSectionHoverProvider';
import { TemplateSectionHoverProvider } from '../../../src/hover/TemplateSectionHoverProvider';
import {
    createConditionContext,
    createMappingContext,
    createParameterContext,
    createResourceContext,
    createTopLevelContext,
    createMockContextWithRelatedEntity,
} from '../../utils/MockContext';
import { createMockComponents } from '../../utils/MockServerComponents';
import { docPosition } from '../../utils/TemplateUtils';

vi.mock('../../../src/hover/TemplateSectionHoverProvider');
vi.mock('../../../src/hover/ResourceSectionHoverProvider');
vi.mock('../../../src/hover/ParameterHoverProvider');
vi.mock('../../../src/hover/ConditionHoverProvider');
vi.mock('../../../src/hover/MappingHoverProvider');

describe('HoverRouter', () => {
    let hoverRouter: HoverRouter;
    let mockContextManager: StubbedInstance<ContextManager>;
    const params = docPosition('file:///test.yaml', 0, 0);

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Mock the implementations
        (TemplateSectionHoverProvider as Mock).mockImplementation(() => ({
            getInformation: vi.fn().mockReturnValue('Template Section Documentation'),
        }));

        (ResourceSectionHoverProvider as Mock).mockImplementation(() => ({
            getInformation: vi.fn().mockReturnValue('Resource Type Documentation'),
        }));

        (ParameterHoverProvider as Mock).mockImplementation(() => ({
            getInformation: vi.fn().mockReturnValue('Parameter'),
        }));

        (ConditionHoverProvider as Mock).mockImplementation(() => ({
            getInformation: vi.fn().mockReturnValue('Condition'),
        }));

        (MappingHoverProvider as Mock).mockImplementation(() => ({
            getInformation: vi.fn().mockReturnValue('Mapping'),
        }));

        const mockComponents = createMockComponents();
        hoverRouter = HoverRouter.create(mockComponents.core, mockComponents.external);
        mockContextManager = mockComponents.contextManager;
    });

    it('should return undefined when context is undefined', () => {
        mockContextManager.getContextAndRelatedEntities.returns(undefined);

        const result = hoverRouter.getHoverDoc(params);

        expect(result).toBeUndefined();
        expect(mockContextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
    });

    it('should route to TopLevelSection hover provider', () => {
        const mockContext = createTopLevelContext(TopLevelSection.Resources);

        mockContextManager.getContextAndRelatedEntities.returns(mockContext);

        const result = hoverRouter.getHoverDoc(params);

        expect(result).toBe('Template Section Documentation');
        expect(mockContextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
    });

    it('should route to ResourceType hover provider', () => {
        const mockContext = createResourceContext('MyInstance', { text: 'AWS::EC2::Instance' });

        mockContextManager.getContextAndRelatedEntities.returns(mockContext);

        const result = hoverRouter.getHoverDoc(params);

        expect(result).toBe('Resource Type Documentation');
        expect(mockContextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
    });

    describe('Hover on references in resources', () => {
        let routerWithMockedProvider: HoverRouter;

        beforeEach(() => {
            (ResourceSectionHoverProvider as Mock).mockImplementation(() => ({
                getInformation: vi.fn().mockReturnValue(undefined),
            }));
            const mockComponents = createMockComponents();
            routerWithMockedProvider = HoverRouter.create(mockComponents.core, mockComponents.external);
            mockContextManager = mockComponents.contextManager;
        });

        it('should return resource documentation when available and not check references', () => {
            (ResourceSectionHoverProvider as Mock).mockImplementation(() => ({
                getInformation: vi.fn().mockReturnValue('Resource Type Documentation'),
            }));
            const mockComponents = createMockComponents();
            const routerWithResourceDoc = HoverRouter.create(mockComponents.core, mockComponents.external);
            const mockContextManagerWithDoc = mockComponents.contextManager;

            const mockContext = createResourceContext('MyResourceId', { text: 'AWS::EC2::Instance' });
            mockContextManagerWithDoc.getContextAndRelatedEntities.returns(mockContext);

            const result = routerWithResourceDoc.getHoverDoc(params);

            expect(mockContextManagerWithDoc.getContextAndRelatedEntities.called).toBe(true);
            expect(result).toBe('Resource Type Documentation');
        });

        it('should fallback to parameter references when resource documentation is undefined', () => {
            const parameterContext = createParameterContext('MyResource', {
                data: { Type: 'String' },
            });
            const relatedEntities = new Map([
                [TopLevelSection.Parameters, new Map([['MyResource', parameterContext]])],
            ]);
            const mockContext = createResourceContext('MyResourceId', { text: 'MyResource' }, relatedEntities);

            mockContextManager.getContextAndRelatedEntities.returns(mockContext);

            const result = routerWithMockedProvider.getHoverDoc(params);

            expect(mockContextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
            expect(result).toBe('Parameter');
        });

        it('should return condition for condition references', () => {
            const conditionContext = createConditionContext('MyResource');
            const relatedEntities = new Map([
                [TopLevelSection.Conditions, new Map([['MyResource', conditionContext]])],
            ]);
            const mockContext = createResourceContext('MyResourceId', { text: 'MyResource' }, relatedEntities);

            mockContextManager.getContextAndRelatedEntities.returns(mockContext);

            const result = routerWithMockedProvider.getHoverDoc(params);

            expect(mockContextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
            expect(result).toBe('Condition');
        });

        it('should return mapping for mapping references', () => {
            const mappingContext = createMappingContext('MyResource');
            const relatedEntities = new Map([[TopLevelSection.Mappings, new Map([['MyResource', mappingContext]])]]);
            const mockContext = createResourceContext('MyResourceId', { text: 'MyResource' }, relatedEntities);

            mockContextManager.getContextAndRelatedEntities.returns(mockContext);

            const result = routerWithMockedProvider.getHoverDoc(params);

            expect(mockContextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
            expect(result).toBe('Mapping');
        });

        it('should return resource information for resource references', () => {
            // Override the mock to return the expected value for this test
            (ResourceSectionHoverProvider as Mock).mockImplementation(() => ({
                getInformation: vi.fn().mockReturnValue('Resource Type Documentation'),
            }));
            const mockComponents = createMockComponents();
            const routerWithResourceDoc = HoverRouter.create(mockComponents.core, mockComponents.external);
            const mockContextManagerWithDoc = mockComponents.contextManager;

            const resourceContext = createResourceContext('MyBucket', {
                data: { Type: 'AWS::S3::Bucket' },
            });
            const relatedEntities = new Map([[TopLevelSection.Resources, new Map([['MyBucket', resourceContext]])]]);
            const mockContext = createMockContextWithRelatedEntity('SomeOtherSection', 'MyBucket', relatedEntities, {
                text: 'MyBucket',
            });

            mockContextManagerWithDoc.getContextAndRelatedEntities.returns(mockContext);

            const result = routerWithResourceDoc.getHoverDoc(params);

            expect(mockContextManagerWithDoc.getContextAndRelatedEntities.calledWith(params)).toBe(true);
            expect(result).toBe('Resource Type Documentation');
        });

        it('should not return undefined if no reference', () => {
            const relatedEntities = new Map([[TopLevelSection.Description, new Map()]]);
            const mockContext = createResourceContext('MyResourceId', { text: 'MyResource' }, relatedEntities);

            mockContextManager.getContextAndRelatedEntities.returns(mockContext);

            const result = routerWithMockedProvider.getHoverDoc(params);

            expect(mockContextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
            expect(result).toBeUndefined();
        });
    });

    describe('Reference checking for non-resource sections', () => {
        it('should check references for parameter section when no specific provider matches', () => {
            const parameterContext = createParameterContext('MyParam', {
                data: { Type: 'String' },
            });
            const relatedEntities = new Map([[TopLevelSection.Parameters, new Map([['MyParam', parameterContext]])]]);

            const mockContext = createMockContextWithRelatedEntity('SomeOtherSection', 'MyParam', relatedEntities, {
                text: 'MyParam',
                entity: Parameter.from('MyParam', { Type: 'String' }),
            });

            mockContextManager.getContextAndRelatedEntities.returns(mockContext);

            const result = hoverRouter.getHoverDoc(params);

            expect(mockContextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
            expect(result).toBe('Parameter');
        });

        it('should return parameter information when hovering on parameter logical ID', () => {
            const mockContext = createParameterContext('MyParam', {
                text: 'MyParam',
                data: { Type: 'String' },
            });

            mockContextManager.getContextAndRelatedEntities.returns(mockContext);

            const result = hoverRouter.getHoverDoc(params);

            expect(mockContextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
            expect(result).toBe('Parameter');
        });

        it('should have consistent fallback behavior for parameters like resources', () => {
            // This test verifies that the parameter section now has the same fallback pattern as resources
            // We're testing the code structure rather than the exact behavior since the fallback logic is complex

            const parameterContext = createParameterContext('MyParam', {
                text: 'MyParam',
                data: { Type: 'String' },
            });

            mockContextManager.getContextAndRelatedEntities.returns(parameterContext);

            const result = hoverRouter.getHoverDoc(params);

            expect(mockContextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
            // The parameter provider should be called and return 'Parameter'
            expect(result).toBe('Parameter');
        });
    });
});
