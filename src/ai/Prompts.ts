import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from '@langchain/core/prompts';
import { toString } from '../utils/String';
import { sanitizeTemplate } from './Utils';

export class Prompts {
    static readonly SYSTEM_CONTEXT = `You are an expert AWS CloudFormation engineer with deep knowledge of:
- CloudFormation syntax, functions, and best practices
- AWS services and their configurations
- Infrastructure as Code patterns
- Security, cost optimization, and reliability principles
- Template validation and troubleshooting

<WritingRecommendations>
Use time efficiently: make sentences concise and direct.
Be objective: avoid adjectives and adverbs.
Avoid jargon, acronyms and weasel words.
Write in a human friendly and understandable manner 
</WritingRecommendations>

Use knowledge bases and documentation to get more context.
`;

    static async describeTemplate(template: string): Promise<string> {
        const promptTemplate = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(this.SYSTEM_CONTEXT),
            HumanMessagePromptTemplate.fromTemplate(`
Analyze this CloudFormation template:

{template}

Provide:
- **Purpose**: What this creates (1-2 sentences)
- **Key Resources**: Main AWS services (list with brief purpose)
- **Architecture**: How components connect (2-3 key relationships)
- **Parameters**: Important inputs and their purpose
- **Outputs**: What gets exported

Then generate a new template following the same input format (JSON or YAML) with code comments which will be helpful to understand the template`),
        ]);

        return await promptTemplate.format({ template: sanitizeTemplate(template) });
    }

    static async optimizeTemplate(template: string): Promise<string> {
        const promptTemplate = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(this.SYSTEM_CONTEXT),
            HumanMessagePromptTemplate.fromTemplate(`
Optimize this CloudFormation template:

{template}

First understand the goal of the template and the business requirements for the service, then provide meaningful improvements in priority order:

**Security Issues:**
- Issue: specific problem
- Fix: exact change needed

**Reliability:**
- Risk: what could fail
- Fix: how to prevent it

**Best Practices:**
- Issue: what's wrong
- Fix: correct approach

**Cost Savings:**
- Resource: what to change
- Savings: estimated impact
- Change: specific modification

**Recommendations:**
- Suggest AWS services and resources that would improve the service
- Suggest opportunities to simplify the template by using Parameters and using default/common values for Resources

Focus on high-impact changes. Include code snippets for fixes.`),
        ]);

        return await promptTemplate.format({ template: sanitizeTemplate(template) });
    }

    static async analyzeDiagnostic(template: string, diagnostics: unknown): Promise<string> {
        const promptTemplate = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(this.SYSTEM_CONTEXT),
            HumanMessagePromptTemplate.fromTemplate(`
Analyze this CloudFormation diagnostic issue:

**Template:**
{template}

**Diagnostic:**
{diagnostics}

Provide a comprehensive analysis:

**Root Cause:**
- What exactly is wrong
- Why this error occurs

**Impact:**
- What happens if not fixed
- Deployment/runtime consequences

**Solution:**
- Step-by-step fix instructions
- Exact code changes needed
- Alternative approaches if applicable

**Prevention:**
- Best practices to avoid this issue
- Related patterns to check

Focus on actionable guidance with specific code examples. Only provide feedback for the specific diagnostics specified, not other issues in the template.`),
        ]);

        return await promptTemplate.format({
            template,
            diagnostics: toString(diagnostics),
        });
    }

    static async generateTemplate(userInput: string): Promise<string> {
        const promptTemplate = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(this.SYSTEM_CONTEXT),
            HumanMessagePromptTemplate.fromTemplate(`
Generate a CloudFormation template file using YAML based on these requirements:

{userInput}

Create a complete, production-ready template that includes:

**Template Structure:**
- AWSTemplateFormatVersion and Description
- Parameters for customization
- Resources with proper configurations
- Outputs for key values

**Best Practices:**
- Use appropriate resource types and properties
- Include security configurations (IAM roles, security groups)
- Add monitoring and logging where applicable
- Use Ref and GetAtt functions correctly
- Include DeletionPolicy where appropriate

**Format:**
- Use YAML format for readability
- Add inline comments explaining key configurations
- Use descriptive logical IDs
- Group related resources logically
- Use parameters for code reuse

**Security & Reliability:**
- Follow AWS security best practices
- Include proper error handling
- Use least privilege access
- Add appropriate tags
`),
        ]);

        return await promptTemplate.format({ userInput });
    }

    static async recommendRelatedResources(
        template: string,
        relationshipContext?: string,
        scannedResourcesInfo?: string,
        hasResourceScan?: boolean,
    ): Promise<string> {
        const resourceScanContext = hasResourceScan
            ? `**Available Resources in Your Account:**
${scannedResourcesInfo ?? 'No specific resources provided'}

Use these actual resources from your AWS account to make specific recommendations with real resource identifiers (ARNs, IDs, names).`
            : `**No Resource Scan Available**
No resource scan found in your AWS account. Showing generic recommendations below. 
For personalized suggestions with actual resource identifiers from your account, please run a resource scan using AWS CloudFormation IaC Generator.

IMPORTANT: Include the following steps in your final response on the top to help the user get personalized recommendations.

**To get personalized recommendations with your actual AWS resources:**

**Step 1: Start a Resource Scan**
\`\`\`bash
aws cloudformation start-resource-scan
\`\`\`

**Step 2: Monitor Scan Progress**
\`\`\`bash
aws cloudformation describe-resource-scan
\`\`\`

**Step 3: Wait for Completion**
- Scans typically take 5-15 minutes depending on account size
- Status will change from "IN_PROGRESS" to "COMPLETE"
- Scans expire after 30 days but can be reused for multiple templates

**Step 4: Re-run This Command**
Once the scan is complete, run this recommendation command again to get specific suggestions with your actual resource identifiers.

**Alternative: Use AWS Console**
1. Go to CloudFormation Console → IaC Generator
2. Click "Start resource scan"
3. Wait for completion
4. Return here for personalized recommendations

---

**Generic Recommendations (without account-specific resources):**`;

        const relationshipInfo = relationshipContext
            ? `**Resource Relationship Context:**
${relationshipContext}

Use this relationship information to understand which AWS resources can connect to the resources in the template.`
            : '';

        const availabilityContext = hasResourceScan
            ? '- **Available in Account**: [Specific resource ID/ARN if found]'
            : '- **Generic Suggestion**: [What type of resource to create]';

        const promptTemplate = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(this.SYSTEM_CONTEXT),
            HumanMessagePromptTemplate.fromTemplate(`
Analyze this CloudFormation template and recommend related AWS resources:

{template}

{resourceScanContext}

{relationshipInfo}

Provide recommendations in this format:

**Related Resources You Could Add:**

For each resource in the template, suggest related resources that would enhance functionality, security, or reliability:

**For [Resource Name] ([Resource Type]):**
- **[Related Resource Type]**: [Specific recommendation]
  {availabilityContext}
  - **Purpose**: [Why this would be beneficial]
  - **Integration**: [How to connect it]

**Architecture Enhancements:**
- **Monitoring**: CloudWatch alarms, dashboards, logs
- **Security**: IAM roles, security groups, KMS keys
- **Networking**: VPCs, subnets, load balancers
- **Storage**: S3 buckets, EBS volumes, backup solutions
- **Compute**: Auto Scaling, Lambda functions
- **Database**: RDS instances, DynamoDB tables

**Best Practice Additions:**
- Resources that follow AWS Well-Architected principles
- Cost optimization opportunities
- Disaster recovery components

Focus on actionable recommendations that directly relate to the existing resources in the template and use the relationship context to suggest valid connections.`),
        ]);

        return await promptTemplate.format({
            template: sanitizeTemplate(template),
            resourceScanContext,
            relationshipInfo,
            availabilityContext,
        });
    }
}
