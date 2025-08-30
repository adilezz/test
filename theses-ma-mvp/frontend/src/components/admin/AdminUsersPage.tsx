import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Calendar,
  Building,
  Shield,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserX,
  ChevronDown,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { adminService } from '../../services/admin';
import { User } from '../../types';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedVerification, setSelectedVerification] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  const [showSuspendModal, setShowSuspendModal] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');

  useEffect(() => {
    loadUsers();
  }, [selectedRole, selectedVerification, searchQuery, sortBy]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        role: selectedRole === 'all' ? undefined : selectedRole,
        isVerified: selectedVerification === 'all' ? undefined : selectedVerification === 'verified',
        search: searchQuery || undefined,
        sortBy
      };
      const result = await adminService.getUsers(params);
      setUsers(result.results);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (id: string) => {
    try {
      await adminService.verifyUser(id);
      toast.success('Utilisateur vérifié avec succès');
      loadUsers();
    } catch (error) {
      toast.error('Erreur lors de la vérification');
    }
  };

  const handleSuspendUser = async (id: string) => {
    if (!suspendReason.trim()) {
      toast.error('Veuillez fournir une raison pour la suspension');
      return;
    }

    try {
      await adminService.suspendUser(id, suspendReason);
      toast.success('Utilisateur suspendu');
      setShowSuspendModal(null);
      setSuspendReason('');
      loadUsers();
    } catch (error) {
      toast.error('Erreur lors de la suspension');
    }
  };

  const handleUpdateRole = async (id: string, newRole: string) => {
    try {
      await adminService.updateUserRole(id, newRole);
      toast.success('Rôle mis à jour avec succès');
      loadUsers();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du rôle');
    }
  };

  const roleOptions = [
    { value: 'all', label: 'Tous les rôles' },
    { value: 'student', label: 'Étudiants' },
    { value: 'researcher', label: 'Chercheurs' },
    { value: 'professor', label: 'Professeurs' },
    { value: 'admin', label: 'Administrateurs' }
  ];

  const verificationOptions = [
    { value: 'all', label: 'Tous' },
    { value: 'verified', label: 'Vérifiés' },
    { value: 'unverified', label: 'Non vérifiés' }
  ];

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-red-500" />;
      case 'professor':
        return <Shield className="w-4 h-4 text-purple-500" />;
      case 'researcher':
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      default:
        return <UserX className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'professor': return 'Professeur';
      case 'researcher': return 'Chercheur';
      case 'student': return 'Étudiant';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'professor': return 'bg-purple-100 text-purple-800';
      case 'researcher': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion des utilisateurs</h1>
        <p className="mt-2 text-gray-600">
          Gérez les comptes utilisateurs et leurs permissions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total utilisateurs', value: users.length, icon: UserCheck, color: 'text-blue-600' },
          { label: 'Vérifiés', value: users.filter(u => u.isVerified).length, icon: ShieldCheck, color: 'text-green-600' },
          { label: 'Professeurs', value: users.filter(u => u.role === 'professor').length, icon: Shield, color: 'text-purple-600' },
          { label: 'Étudiants', value: users.filter(u => u.role === 'student').length, icon: UserX, color: 'text-amber-600' }
        ].map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <IconComponent className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, institution..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Verification Filter */}
          <select
            value={selectedVerification}
            onChange={(e) => setSelectedVerification(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {verificationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="createdAt_desc">Plus récent</option>
              <option value="createdAt_asc">Plus ancien</option>
              <option value="name">Nom A-Z</option>
              <option value="email">Email A-Z</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UserX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun utilisateur trouvé
            </h3>
            <p className="text-gray-600">
              Aucun utilisateur ne correspond aux critères sélectionnés
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </span>
                    </div>

                    {/* User Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-gray-900">{user.name}</h3>
                        {user.isVerified && (
                          <ShieldCheck className="w-4 h-4 text-green-500" title="Vérifié" />
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Building className="w-4 h-4" />
                          <span>{user.institution}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR')}</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span>{getRoleLabel(user.role)}</span>
                        </span>
                        
                        {!user.isVerified && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                            Non vérifié
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {!user.isVerified && (
                      <button
                        onClick={() => handleVerifyUser(user.id)}
                        className="p-2 text-gray-400 hover:text-green-600 transition-colors duration-200"
                        title="Vérifier l'utilisateur"
                      >
                        <UserCheck className="w-4 h-4" />
                      </button>
                    )}

                    <div className="relative group">
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <button 
                          onClick={() => {/* View profile logic */}}
                          className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Voir le profil</span>
                        </button>
                        
                        <div className="px-4 py-2">
                          <label className="block text-xs text-gray-500 mb-1">Changer le rôle:</label>
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="student">Étudiant</option>
                            <option value="researcher">Chercheur</option>
                            <option value="professor">Professeur</option>
                            {user.role === 'admin' && <option value="admin">Administrateur</option>}
                          </select>
                        </div>
                        
                        <hr className="my-1" />
                        
                        <button 
                          onClick={() => setShowSuspendModal(user.id)}
                          className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50"
                        >
                          <UserX className="w-4 h-4" />
                          <span>Suspendre</span>
                        </button>
                        
                        <button 
                          onClick={() => {/* Delete user logic */}}
                          className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Suspendre l'utilisateur
            </h3>
            <p className="text-gray-600 mb-4">
              Veuillez fournir une raison pour la suspension de cet utilisateur.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Raison de la suspension..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSuspendModal(null);
                  setSuspendReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSuspendUser(showSuspendModal)}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors duration-200"
              >
                Suspendre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}