import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  BookOpen, 
  Users, 
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { 
  University, 
  Faculty, 
  School, 
  Degree, 
  Discipline, 
  SubDiscipline, 
  Specialty,
  Thesis 
} from '../../types/api';

type TabType = 'universities' | 'degrees' | 'disciplines' | 'theses';

interface TreeNode {
  id: number;
  name: string;
  type: 'university' | 'faculty' | 'school' | 'discipline' | 'subdiscipline' | 'specialty';
  children?: TreeNode[];
  expanded?: boolean;
  data: any;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('universities');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  
  // Data states
  const [universities, setUniversities] = useState<University[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [degrees, setDegrees] = useState<Degree[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subDisciplines, setSubDisciplines] = useState<SubDiscipline[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [theses, setTheses] = useState<Thesis[]>([]);
  
  // Tree state
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'universities':
          await loadUniversityTree();
          break;
        case 'degrees':
          const degreesData = await apiService.getDegrees();
          setDegrees(degreesData);
          break;
        case 'disciplines':
          await loadDisciplineTree();
          break;
        case 'theses':
          const thesesData = await apiService.searchTheses({ size: 50 });
          setTheses(thesesData.items);
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUniversityTree = async () => {
    const [universitiesData, facultiesData, schoolsData] = await Promise.all([
      apiService.getUniversities(),
      apiService.getFaculties(),
      apiService.getSchools()
    ]);
    
    setUniversities(universitiesData);
    setFaculties(facultiesData);
    setSchools(schoolsData);
    
    const tree = buildUniversityTree(universitiesData, facultiesData, schoolsData);
    setTreeData(tree);
  };

  const loadDisciplineTree = async () => {
    const [disciplinesData, subDisciplinesData, specialtiesData] = await Promise.all([
      apiService.getDisciplines(),
      apiService.getSubDisciplines(),
      apiService.getSpecialties()
    ]);
    
    setDisciplines(disciplinesData);
    setSubDisciplines(subDisciplinesData);
    setSpecialties(specialtiesData);
    
    const tree = buildDisciplineTree(disciplinesData, subDisciplinesData, specialtiesData);
    setTreeData(tree);
  };

  const buildUniversityTree = (universities: University[], faculties: Faculty[], schools: School[]): TreeNode[] => {
    return universities.map(university => ({
      id: university.id,
      name: university.name,
      type: 'university',
      data: university,
      expanded: false,
      children: faculties
        .filter(faculty => faculty.university_id === university.id)
        .map(faculty => ({
          id: faculty.id,
          name: faculty.name,
          type: 'faculty',
          data: faculty,
          expanded: false,
          children: schools
            .filter(school => school.faculty_id === faculty.id)
            .map(school => ({
              id: school.id,
              name: school.name,
              type: 'school',
              data: school,
              children: []
            }))
        }))
    }));
  };

  const buildDisciplineTree = (disciplines: Discipline[], subDisciplines: SubDiscipline[], specialties: Specialty[]): TreeNode[] => {
    return disciplines.map(discipline => ({
      id: discipline.id,
      name: discipline.name,
      type: 'discipline',
      data: discipline,
      expanded: false,
      children: subDisciplines
        .filter(subDiscipline => subDiscipline.discipline_id === discipline.id)
        .map(subDiscipline => ({
          id: subDiscipline.id,
          name: subDiscipline.name,
          type: 'subdiscipline',
          data: subDiscipline,
          expanded: false,
          children: specialties
            .filter(specialty => specialty.sub_discipline_id === subDiscipline.id)
            .map(specialty => ({
              id: specialty.id,
              name: specialty.name,
              type: 'specialty',
              data: specialty,
              children: []
            }))
        }))
    }));
  };

  const toggleNode = (nodeId: number, path: number[] = []) => {
    const updateNode = (nodes: TreeNode[], currentPath: number[]): TreeNode[] => {
      return nodes.map((node, index) => {
        const newPath = [...currentPath, index];
        if (node.id === nodeId && newPath.length === path.length + 1) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: updateNode(node.children, newPath) };
        }
        return node;
      });
    };
    
    setTreeData(updateNode(treeData, []));
  };

  const handleCreate = async (data: any) => {
    try {
      switch (activeTab) {
        case 'universities':
          if (data.type === 'university') {
            await apiService.createUniversity(data);
          } else if (data.type === 'faculty') {
            await apiService.createFaculty(data);
          } else if (data.type === 'school') {
            await apiService.createSchool(data);
          }
          break;
        case 'degrees':
          await apiService.createDegree(data);
          break;
        case 'disciplines':
          if (data.type === 'discipline') {
            await apiService.createDiscipline(data);
          } else if (data.type === 'subdiscipline') {
            await apiService.createSubDiscipline(data);
          } else if (data.type === 'specialty') {
            await apiService.createSpecialty(data);
          }
          break;
      }
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const handleEdit = async (data: any) => {
    try {
      const id = editingItem.id;
      switch (activeTab) {
        case 'universities':
          if (editingItem.type === 'university') {
            await apiService.updateUniversity(id, data);
          } else if (editingItem.type === 'faculty') {
            await apiService.updateFaculty(id, data);
          } else if (editingItem.type === 'school') {
            await apiService.updateSchool(id, data);
          }
          break;
        case 'degrees':
          await apiService.updateDegree(id, data);
          break;
        case 'disciplines':
          if (editingItem.type === 'discipline') {
            await apiService.updateDiscipline(id, data);
          } else if (editingItem.type === 'subdiscipline') {
            await apiService.updateSubDiscipline(id, data);
          } else if (editingItem.type === 'specialty') {
            await apiService.updateSpecialty(id, data);
          }
          break;
      }
      setShowEditModal(false);
      setEditingItem(null);
      loadData();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;
    
    try {
      switch (activeTab) {
        case 'universities':
          if (item.type === 'university') {
            await apiService.deleteUniversity(item.id);
          } else if (item.type === 'faculty') {
            await apiService.deleteFaculty(item.id);
          } else if (item.type === 'school') {
            await apiService.deleteSchool(item.id);
          }
          break;
        case 'degrees':
          await apiService.deleteDegree(item.id);
          break;
        case 'disciplines':
          if (item.type === 'discipline') {
            await apiService.deleteDiscipline(item.id);
          } else if (item.type === 'subdiscipline') {
            await apiService.deleteSubDiscipline(item.id);
          } else if (item.type === 'specialty') {
            await apiService.deleteSpecialty(item.id);
          }
          break;
        case 'theses':
          await apiService.deleteThesis(item.id);
          break;
      }
      loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.id} className="select-none">
        <div 
          className={`flex items-center space-x-2 py-2 px-3 hover:bg-gray-50 rounded-lg cursor-pointer ${
            level > 0 ? `ml-${level * 6}` : ''
          }`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {node.expanded ? 
                <ChevronDown className="w-4 h-4" /> : 
                <ChevronRight className="w-4 h-4" />
              }
            </button>
          ) : (
            <div className="w-6 h-6" />
          )}
          
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {node.type === 'university' && <Building className="w-4 h-4 text-blue-600" />}
              {node.type === 'faculty' && <GraduationCap className="w-4 h-4 text-green-600" />}
              {node.type === 'school' && <BookOpen className="w-4 h-4 text-purple-600" />}
              {node.type === 'discipline' && <BookOpen className="w-4 h-4 text-indigo-600" />}
              {node.type === 'subdiscipline' && <BookOpen className="w-4 h-4 text-teal-600" />}
              {node.type === 'specialty' && <BookOpen className="w-4 h-4 text-orange-600" />}
              <span className="font-medium text-gray-900">{node.name}</span>
              {node.data.code && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {node.data.code}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => {
                  setEditingItem({ ...node.data, type: node.type });
                  setShowEditModal(true);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete({ ...node.data, type: node.type })}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {node.expanded && node.children && (
          <div>
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderThesesTable = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Titre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Auteur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Université
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {theses.map((thesis) => (
              <tr key={thesis.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 line-clamp-2">
                    {thesis.title}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {thesis.author_first_name} {thesis.author_last_name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {thesis.university?.name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    thesis.status === 'published' ? 'bg-green-100 text-green-800' :
                    thesis.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                    thesis.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {thesis.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/admin/thesis/${thesis.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(thesis)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Accès refusé</h1>
          <p className="text-gray-600">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-600 mt-2">Gérer les données de référence et les thèses</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {[
              { id: 'universities', label: 'Universités', icon: Building },
              { id: 'degrees', label: 'Diplômes', icon: GraduationCap },
              { id: 'disciplines', label: 'Disciplines', icon: BookOpen },
              { id: 'theses', label: 'Thèses', icon: Users }
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center space-x-2 py-4 border-b-2 whitespace-nowrap transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </div>

          {/* Content based on active tab */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div>
              {activeTab === 'theses' ? (
                renderThesesTable()
              ) : (
                <div className="space-y-2">
                  {treeData.map(node => renderTreeNode(node))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}