import React, { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  Mail,
  Building2,
  GraduationCap,
  X,
  Check,
  AlertCircle,
  UserPlus,
  ExternalLink
} from 'lucide-react';
import { apiService } from '../../services/api';
import { 
  AcademicPersonResponse,
  PaginatedResponse,
  AcademicPersonCreate,
  AcademicPersonUpdate,
  UniversityResponse,
  FacultyResponse
} from '../../types/api';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'delete' | 'view';
  item?: AcademicPersonResponse;
}

export default function AdminAcademicPersonsPage() {
  const [data, setData] = useState<AcademicPersonResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [universities, setUniversities] = useState<UniversityResponse[]>([]);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, mode: 'create' });
  const [formData, setFormData] = useState<AcademicPersonCreate>({
    first_name: '',
    last_name: '',
    email: '',
    title: '',
    orcid: ''
  });

  useEffect(() => {
    loadData();
    loadUniversities();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiService.adminList<PaginatedResponse>('academic_persons', { limit: 1000 });
      setData(response.data);
    } catch (error) {
      console.error('Error loading academic persons:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUniversities = async () => {
    try {
      const response = await apiService.adminList<PaginatedResponse>('universities', { limit: 1000 });
      setUniversities(response.data);
    } catch (error) {
      console.error('Error loading universities:', error);
    }
  };

  const handleCreate = async () => {
    try {
      await apiService.adminCreate('academic_persons', formData);
      setModal({ isOpen: false, mode: 'create' });
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error creating academic person:', error);
    }
  };

  const handleUpdate = async () => {
    if (!modal.item) return;
    
    try {
      await apiService.adminUpdate('academic_persons', modal.item.id, formData);
      setModal({ isOpen: false, mode: 'edit' });
      loadData();
    } catch (error) {
      console.error('Error updating academic person:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.adminDelete('academic_persons', id);
      loadData();
    } catch (error) {
      console.error('Error deleting academic person:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      title: '',
      orcid: ''
    });
  };

  const openModal = (mode: ModalState['mode'], item?: AcademicPersonResponse) => {
    setModal({ isOpen: true, mode, item });
    
    if (mode === 'edit' && item) {
      setFormData({
        first_name: item.first_name,
        last_name: item.last_name,
        email: item.email || '',
        title: item.title || '',
        orcid: item.orcid || ''
      });
    } else if (mode === 'create') {
      resetForm();
    }
  };

  const filteredData = data.filter(person => 
    person.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (person.email && person.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderModal = () => {
    if (!modal.isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {modal.mode === 'create' && 'Nouvelle Personne Académique'}
              {modal.mode === 'edit' && 'Modifier Personne Académique'}
              {modal.mode === 'view' && 'Détails Personne Académique'}
              {modal.mode === 'delete' && 'Supprimer Personne Académique'}
            </h2>
            <button
              onClick={() => setModal({ isOpen: false, mode: 'create' })}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {(modal.mode === 'create' || modal.mode === 'edit') && (
            <form onSubmit={(e) => {
              e.preventDefault();
              modal.mode === 'create' ? handleCreate() : handleUpdate();
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dr., Prof., etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ORCID
                  </label>
                  <input
                    type="text"
                    value={formData.orcid}
                    onChange={(e) => setFormData({ ...formData, orcid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0000-0000-0000-0000"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setModal({ isOpen: false, mode: 'create' })}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {modal.mode === 'create' ? 'Créer' : 'Modifier'}
                </button>
              </div>
            </form>
          )}

          {modal.mode === 'view' && modal.item && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                <p className="mt-1 text-gray-900">
                  {modal.item.title && `${modal.item.title} `}
                  {modal.item.first_name} {modal.item.last_name}
                </p>
              </div>
              
              {modal.item.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-gray-900">{modal.item.email}</p>
                </div>
              )}
              
              {modal.item.orcid && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">ORCID</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className="text-gray-900">{modal.item.orcid}</span>
                    <a
                      href={`https://orcid.org/${modal.item.orcid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Créée le</label>
                <p className="mt-1 text-gray-900">
                  {new Date(modal.item.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Personnes Académiques</h1>
              <p className="text-gray-600 mt-2">
                Gérer les auteurs, directeurs de thèse et membres de jury
              </p>
            </div>
            <button
              onClick={() => openModal('create')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nouvelle Personne</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Personnes</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Mail className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avec Email</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.filter(p => p.email).length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <ExternalLink className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avec ORCID</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {data.filter(p => p.orcid).length.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                <span>Filtres</span>
              </button>
            </div>

            <div className="text-sm text-gray-600">
              {filteredData.length} personne{filteredData.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Personne
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ORCID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Créée le
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {person.first_name.charAt(0)}{person.last_name.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {person.title && `${person.title} `}
                            {person.first_name} {person.last_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {person.email ? (
                          <a href={`mailto:${person.email}`} className="text-blue-600 hover:text-blue-800">
                            {person.email}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {person.orcid ? (
                          <a
                            href={`https://orcid.org/${person.orcid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                          >
                            <span>{person.orcid}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(person.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal('view', person)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal('edit', person)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer cette personne ?')) {
                              handleDelete(person.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredData.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  {searchTerm ? 'Aucune personne trouvée pour cette recherche' : 'Aucune personne trouvée'}
                </p>
              </div>
            )}
          </div>
        </div>

        {renderModal()}
      </div>
    </div>
  );
}