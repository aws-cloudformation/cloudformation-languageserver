import { Capability } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Document } from '../../../src/document/Document';
import { CfnService } from '../../../src/services/CfnService';
import { analyzeCapabilities } from '../../../src/stackActions/CapabilityAnalyzer';

describe('analyzeCapabilities', () => {
    const mockDocument = {
        getText: vi.fn(),
    } as unknown as Document;

    const mockCfnService = {
        validateTemplate: vi.fn(),
    } as unknown as CfnService;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return empty array when validateTemplate returns undefined capabilities', async () => {
        (mockDocument.getText as any).mockReturnValue('template content');
        (mockCfnService.validateTemplate as any).mockResolvedValue({ Capabilities: undefined });

        const result = await analyzeCapabilities(mockDocument, mockCfnService);

        expect(result).toEqual([]);
        expect(mockCfnService.validateTemplate).toHaveBeenCalledWith({ TemplateBody: 'template content' });
    });

    it('should return all capabilities when CAPABILITY_AUTO_EXPAND is present', async () => {
        (mockDocument.getText as any).mockReturnValue('template content');
        (mockCfnService.validateTemplate as any).mockResolvedValue({
            Capabilities: [Capability.CAPABILITY_AUTO_EXPAND, Capability.CAPABILITY_IAM],
        });

        const result = await analyzeCapabilities(mockDocument, mockCfnService);

        expect(result).toEqual([
            Capability.CAPABILITY_IAM,
            Capability.CAPABILITY_NAMED_IAM,
            Capability.CAPABILITY_AUTO_EXPAND,
        ]);
    });

    it('should return the exact capabilities when no AUTO_EXPAND', async () => {
        (mockDocument.getText as any).mockReturnValue('template content');
        (mockCfnService.validateTemplate as any).mockResolvedValue({
            Capabilities: [Capability.CAPABILITY_IAM],
        });

        const result = await analyzeCapabilities(mockDocument, mockCfnService);

        expect(result).toEqual([Capability.CAPABILITY_IAM]);
    });

    it('should return both IAM capabilities when both are present', async () => {
        (mockDocument.getText as any).mockReturnValue('template content');
        (mockCfnService.validateTemplate as any).mockResolvedValue({
            Capabilities: [Capability.CAPABILITY_IAM, Capability.CAPABILITY_NAMED_IAM],
        });

        const result = await analyzeCapabilities(mockDocument, mockCfnService);

        expect(result).toEqual([Capability.CAPABILITY_IAM, Capability.CAPABILITY_NAMED_IAM]);
    });

    it('should return all capabilities when validateTemplate throws error', async () => {
        (mockDocument.getText as any).mockReturnValue('template content');
        (mockCfnService.validateTemplate as any).mockRejectedValue(new Error('Validation failed'));

        const result = await analyzeCapabilities(mockDocument, mockCfnService);

        expect(result).toEqual([
            Capability.CAPABILITY_IAM,
            Capability.CAPABILITY_NAMED_IAM,
            Capability.CAPABILITY_AUTO_EXPAND,
        ]);
    });

    it('should return empty array when validateTemplate returns no capabilities', async () => {
        (mockDocument.getText as any).mockReturnValue('template content');
        (mockCfnService.validateTemplate as any).mockResolvedValue({
            Capabilities: [],
        });

        const result = await analyzeCapabilities(mockDocument, mockCfnService);

        expect(result).toEqual([]);
    });
});
