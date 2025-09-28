import { TreeNode as UITreeNode } from '../types/tree';
import { 
  UniversityResponse, 
  FacultyResponse, 
  SchoolResponse, 
  PrivateInstitutionResponse 
} from '../types/api';

export interface UnifiedInstitutionNode {
  id: string;
  name_fr: string;
  name_en?: string;
  name_ar?: string;
  type: 'university' | 'faculty' | 'school' | 'department' | 'private_institution';
  parent_type?: 'university' | 'school' | 'private_institution';
  parent_id?: string;
  children?: UnifiedInstitutionNode[];
  metadata?: {
    institution_type?: string;
    level?: string;
    accreditation_status?: string;
    website?: string;
    email?: string;
    phone?: string;
  };
}

export function buildUnifiedInstitutionTree(
  universities: UniversityResponse[],
  faculties: FacultyResponse[],
  schools: SchoolResponse[],
  departments: any[],
  privateInstitutions: PrivateInstitutionResponse[]
): UITreeNode[] {
  const tree: UITreeNode[] = [];
  
  // Create university nodes
  const universityNodes: UITreeNode[] = universities.map(uni => ({
    id: uni.id,
    label: uni.name_fr,
    label_en: uni.name_en,
    label_ar: uni.name_ar,
    type: 'university',
    level: 0,
    count: 0,
    children: []
  }));

  // Create school nodes
  const schoolNodes: UITreeNode[] = schools.map(school => ({
    id: school.id,
    label: school.name_fr,
    label_en: school.name_en,
    label_ar: school.name_ar,
    type: 'school',
    level: 0,
    count: 0,
    children: []
  }));

  // Create private institution nodes
  const privateNodes: UITreeNode[] = privateInstitutions.map(inst => ({
    id: inst.id,
    label: inst.name_fr,
    label_en: inst.name_en,
    label_ar: inst.name_ar,
    type: 'university', // Use university type for private institutions
    level: 0,
    count: 0,
    children: [],
    metadata: {
      institution_type: inst.institution_type,
      level: inst.level,
      accreditation_status: inst.accreditation_status,
      website: inst.website,
      email: inst.email,
      phone: inst.phone
    }
  }));

  // Add faculties to universities
  faculties.forEach(faculty => {
    const universityNode = universityNodes.find(uni => uni.id === faculty.university_id);
    if (universityNode) {
      const facultyNode: UITreeNode = {
        id: faculty.id,
        label: faculty.name_fr,
        label_en: faculty.name_en,
        label_ar: faculty.name_ar,
        type: 'faculty',
        level: 1,
        count: 0,
        children: []
      };
      universityNode.children!.push(facultyNode);
    }
  });

  // Add departments to faculties
  departments.forEach(dept => {
    if (dept.faculty_id) {
      const universityNode = universityNodes.find(uni => 
        uni.children?.some(fac => fac.id === dept.faculty_id)
      );
      if (universityNode) {
        const facultyNode = universityNode.children!.find(fac => fac.id === dept.faculty_id);
        if (facultyNode) {
          const departmentNode: UITreeNode = {
            id: dept.id,
            label: dept.name_fr,
            label_en: dept.name_en,
            label_ar: dept.name_ar,
            type: 'department',
            level: 2,
            count: 0,
            children: []
          };
          facultyNode.children!.push(departmentNode);
        }
      }
    } else if (dept.school_id) {
      const schoolNode = schoolNodes.find(school => school.id === dept.school_id);
      if (schoolNode) {
        const departmentNode: UITreeNode = {
          id: dept.id,
          label: dept.name_fr,
          label_en: dept.name_en,
          label_ar: dept.name_ar,
          type: 'department',
          level: 1,
          count: 0,
          children: []
        };
        schoolNode.children!.push(departmentNode);
      }
    }
  });

  // Build the unified tree with parent categories
  const unifiedTree: UITreeNode[] = [
    {
      id: 'universities',
      label: 'Universités Publiques',
      type: 'university',
      level: 0,
      count: universityNodes.length,
      children: universityNodes
    },
    {
      id: 'schools',
      label: 'Établissements Non-Universitaires',
      type: 'school',
      level: 0,
      count: schoolNodes.length,
      children: schoolNodes
    },
    {
      id: 'private',
      label: 'Établissements Privés',
      type: 'university',
      level: 0,
      count: privateNodes.length,
      children: privateNodes
    }
  ];

  return unifiedTree;
}

export function findInstitutionById(
  tree: UITreeNode[],
  id: string
): UITreeNode | null {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }
    if (node.children) {
      const found = findInstitutionById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function getInstitutionPath(
  tree: UITreeNode[],
  id: string
): string[] {
  const path: string[] = [];
  
  function searchPath(nodes: UITreeNode[], targetId: string, currentPath: string[]): boolean {
    for (const node of nodes) {
      const newPath = [...currentPath, node.label];
      if (node.id === targetId) {
        path.push(...newPath);
        return true;
      }
      if (node.children && searchPath(node.children, targetId, newPath)) {
        return true;
      }
    }
    return false;
  }
  
  searchPath(tree, id, []);
  return path;
}