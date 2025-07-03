import { 
  doc, 
  updateDoc, 
  getDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Design Assignment Service
 * Handles the logic for assigning designs to business types in campaigns
 */

// Types for design assignment
export interface DesignAssignment {
  designId: string;
  businessTypes: string[];
  leadCount: number;
  designName?: string;
  createdAt?: Timestamp;
}

export interface AssignmentStrategy {
  type: 'unified' | 'per-type' | 'custom';
  label: string;
  description: string;
  designCount: number;
  estimatedTime: string;
}

export interface AssignmentSummary {
  totalLeads: number;
  totalDesigns: number;
  assignments: DesignAssignment[];
  businessTypes: Array<{
    type: string;
    count: number;
    assignedDesignId?: string;
  }>;
  strategy: AssignmentStrategy['type'];
}

/**
 * Get available assignment strategies for a campaign
 */
export function getAssignmentStrategies(
  businessTypes: string[], 
  totalLeads: number
): AssignmentStrategy[] {
  const strategies: AssignmentStrategy[] = [
    {
      type: 'unified',
      label: `One Design for All (${totalLeads} recipients)`,
      description: 'Single design reaches everyone - fastest and most cost-effective',
      designCount: 1,
      estimatedTime: '2-3 minutes'
    }
  ];

  // Only show per-type if multiple business types
  if (businessTypes.length > 1) {
    strategies.push({
      type: 'per-type',
      label: `One Per Type (${businessTypes.length} designs)`,
      description: 'Targeted design for each business type - better relevance',
      designCount: businessTypes.length,
      estimatedTime: `${businessTypes.length * 2}-${businessTypes.length * 3} minutes`
    });

    strategies.push({
      type: 'custom',
      label: 'Custom Assignment',
      description: 'Full control over which businesses get which designs',
      designCount: -1, // Variable
      estimatedTime: '5-10 minutes'
    });
  }

  return strategies;
}

/**
 * Create design assignments based on strategy
 */
export async function createDesignAssignments(
  campaignId: string,
  strategy: AssignmentStrategy['type'],
  businessTypeData: Array<{ type: string; count: number }>,
  customAssignments?: DesignAssignment[]
): Promise<{ success: boolean; assignments?: DesignAssignment[]; error?: string }> {
  try {
    let assignments: DesignAssignment[] = [];

    switch (strategy) {
      case 'unified':
        // Single design for all business types
        assignments = [{
          designId: `design_${Date.now()}_1`, // Will be replaced with actual design ID
          businessTypes: businessTypeData.map(bt => bt.type),
          leadCount: businessTypeData.reduce((sum, bt) => sum + bt.count, 0),
          designName: 'Universal Design',
          createdAt: serverTimestamp() as Timestamp
        }];
        break;

      case 'per-type':
        // One design per business type
        assignments = businessTypeData.map((bt, index) => ({
          designId: `design_${Date.now()}_${index + 1}`,
          businessTypes: [bt.type],
          leadCount: bt.count,
          designName: `${bt.type.charAt(0).toUpperCase() + bt.type.slice(1)} Design`,
          createdAt: serverTimestamp() as Timestamp
        }));
        break;

      case 'custom':
        // Use provided custom assignments
        if (!customAssignments) {
          throw new Error('Custom assignments required for custom strategy');
        }
        assignments = customAssignments;
        break;

      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }

    // Save assignments to campaign
    await updateCampaignAssignments(campaignId, assignments, strategy);

    return { success: true, assignments };

  } catch (error) {
    console.error('Error creating design assignments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Update design assignments for a campaign
 */
export async function updateCampaignAssignments(
  campaignId: string,
  assignments: DesignAssignment[],
  strategy: AssignmentStrategy['type']
): Promise<{ success: boolean; error?: string }> {
  try {
    const campaignRef = doc(db, 'campaigns', campaignId);
    
    await updateDoc(campaignRef, {
      designAssignments: assignments,
      assignmentStrategy: strategy,
      updatedAt: serverTimestamp(),
      status: 'assigning_designs'
    });

    return { success: true };

  } catch (error) {
    console.error('Error updating campaign assignments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get current design assignments for a campaign
 */
export async function getDesignAssignmentSummary(
  campaignId: string
): Promise<AssignmentSummary | null> {
  try {
    const campaignRef = doc(db, 'campaigns', campaignId);
    const campaignSnap = await getDoc(campaignRef);

    if (!campaignSnap.exists()) {
      return null;
    }

    const data = campaignSnap.data();
    const assignments = data.designAssignments || [];
    const businessTypes = data.businessTypes || [];
    
    // Calculate business type data
    const businessTypeData = businessTypes.map((type: string) => {
      const assignment = assignments.find((a: DesignAssignment) => 
        a.businessTypes.includes(type)
      );
      
      return {
        type,
        count: assignment?.leadCount || 0,
        assignedDesignId: assignment?.designId
      };
    });

    return {
      totalLeads: data.totalLeadCount || 0,
      totalDesigns: assignments.length,
      assignments,
      businessTypes: businessTypeData,
      strategy: data.assignmentStrategy || 'unified'
    };

  } catch (error) {
    console.error('Error getting assignment summary:', error);
    return null;
  }
}

/**
 * Reassign a business type to a different design
 */
export async function reassignBusinessType(
  campaignId: string,
  businessType: string,
  fromDesignId: string,
  toDesignId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const summary = await getDesignAssignmentSummary(campaignId);
    if (!summary) {
      throw new Error('Campaign not found');
    }

    // Update assignments
    const updatedAssignments = summary.assignments.map(assignment => {
      if (assignment.designId === fromDesignId) {
        // Remove business type from this design
        return {
          ...assignment,
          businessTypes: assignment.businessTypes.filter(bt => bt !== businessType),
          leadCount: assignment.leadCount - (summary.businessTypes.find(bt => bt.type === businessType)?.count || 0)
        };
      } else if (assignment.designId === toDesignId) {
        // Add business type to this design
        return {
          ...assignment,
          businessTypes: [...assignment.businessTypes, businessType],
          leadCount: assignment.leadCount + (summary.businessTypes.find(bt => bt.type === businessType)?.count || 0)
        };
      }
      return assignment;
    }).filter(assignment => assignment.businessTypes.length > 0); // Remove empty assignments

    await updateCampaignAssignments(campaignId, updatedAssignments, 'custom');

    return { success: true };

  } catch (error) {
    console.error('Error reassigning business type:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Add a new design to assignments
 */
export async function addDesignToAssignments(
  campaignId: string,
  designName: string = 'New Design'
): Promise<{ success: boolean; designId?: string; error?: string }> {
  try {
    const summary = await getDesignAssignmentSummary(campaignId);
    if (!summary) {
      throw new Error('Campaign not found');
    }

    const newDesignId = `design_${Date.now()}_${summary.assignments.length + 1}`;
    const newAssignment: DesignAssignment = {
      designId: newDesignId,
      businessTypes: [],
      leadCount: 0,
      designName,
      createdAt: serverTimestamp() as Timestamp
    };

    const updatedAssignments = [...summary.assignments, newAssignment];
    await updateCampaignAssignments(campaignId, updatedAssignments, 'custom');

    return { success: true, designId: newDesignId };

  } catch (error) {
    console.error('Error adding design to assignments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Remove a design from assignments
 */
export async function removeDesignFromAssignments(
  campaignId: string,
  designId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const summary = await getDesignAssignmentSummary(campaignId);
    if (!summary) {
      throw new Error('Campaign not found');
    }

    // Check if design has business types assigned
    const designToRemove = summary.assignments.find(a => a.designId === designId);
    if (designToRemove && designToRemove.businessTypes.length > 0) {
      throw new Error('Cannot remove design with assigned business types. Reassign them first.');
    }

    const updatedAssignments = summary.assignments.filter(a => a.designId !== designId);
    await updateCampaignAssignments(campaignId, updatedAssignments, summary.strategy);

    return { success: true };

  } catch (error) {
    console.error('Error removing design from assignments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate assignment completeness
 */
export function validateAssignments(summary: AssignmentSummary): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if all business types are assigned
  const unassignedTypes = summary.businessTypes.filter(bt => !bt.assignedDesignId);
  if (unassignedTypes.length > 0) {
    errors.push(`Unassigned business types: ${unassignedTypes.map(bt => bt.type).join(', ')}`);
  }

  // Check if any designs have no assignments
  const emptyDesigns = summary.assignments.filter(a => a.businessTypes.length === 0);
  if (emptyDesigns.length > 0) {
    warnings.push(`${emptyDesigns.length} design(s) have no business types assigned`);
  }

  // Check lead count consistency
  const totalAssignedLeads = summary.assignments.reduce((sum, a) => sum + a.leadCount, 0);
  if (totalAssignedLeads !== summary.totalLeads) {
    errors.push(`Lead count mismatch: ${totalAssignedLeads} assigned vs ${summary.totalLeads} total`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get business type suggestions based on existing assignments
 */
export function getBusinessTypeSuggestions(
  businessTypes: string[],
  existingAssignments: DesignAssignment[]
): Array<{
  type: string;
  suggestedDesign?: string;
  reason: string;
}> {
  return businessTypes.map(type => {
    // Check if similar business types are already assigned
    const similarAssignment = existingAssignments.find(assignment =>
      assignment.businessTypes.some(bt =>
        bt.toLowerCase().includes(type.toLowerCase()) ||
        type.toLowerCase().includes(bt.toLowerCase())
      )
    );

    if (similarAssignment) {
      return {
        type,
        suggestedDesign: similarAssignment.designId,
        reason: `Similar to ${similarAssignment.businessTypes.join(', ')}`
      };
    }

    return {
      type,
      reason: 'No similar assignments found'
    };
  });
} 