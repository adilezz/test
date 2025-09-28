import { TreeNode as UITreeNode } from '../types/tree';
import { TreeNodeData } from '../types/api';

/**
 * Generic mapper: converts API nested tree data (TreeNodeData) to UI TreeView nodes.
 * A typeResolver decides the UI node type per depth and node.
 */
export function mapApiTreeToUiNodes(
	data: TreeNodeData[],
	typeResolver: (level: number, node: TreeNodeData, parent?: TreeNodeData) => UITreeNode['type']
): UITreeNode[] {
	const build = (node: TreeNodeData, level: number, parent?: TreeNodeData): UITreeNode => ({
		id: node.id,
		label: node.name_fr,
		label_ar: node.name_ar,
		label_en: node.name_en,
		count: node.thesis_count || 0,
		type: typeResolver(level, node, parent),
		level,
		children: Array.isArray(node.children)
			? node.children.map((child) => build(child, level + 1, node))
			: undefined
	});

	return Array.isArray(data) ? data.map((n) => build(n, 0)) : [];
}

// Convenience resolvers
export const universitiesHierarchyResolver = (
	level: number
): UITreeNode['type'] => {
	if (level === 0) return 'university';
	if (level === 1) return 'faculty';
	return 'department';
};

export const schoolsHierarchyResolver = (
	level: number
): UITreeNode['type'] => {
	if (level === 0) return 'school';
	return 'department';
};

export const categoriesHierarchyResolver = (
	level: number
): UITreeNode['type'] => {
	if (level === 0) return 'category';
	if (level === 1) return 'subdiscipline';
	if (level === 2) return 'specialty';
	return 'category';
};

export const geographicHierarchyResolver = (
	level: number
): UITreeNode['type'] => {
	if (level === 0) return 'location';
	if (level === 1) return 'location';
	if (level === 2) return 'location';
	return 'location';
};

