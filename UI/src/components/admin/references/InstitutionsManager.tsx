import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import TreeView from '../../ui/TreeView/TreeView';
import { TreeNode } from '../../../types/tree';
import apiService from '../../../services/api';
import UniversitiesCrud from './UniversitiesCrud';

const InstitutionsManager: React.FC = () => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTree = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use public tree for now; admin tree also exists
      const tree = await apiService.getUniversitiesTree(true, 3);
      const mapped: TreeNode[] = tree.map((u) => ({
        id: u.id,
        label: u.name_fr,
        count: u.thesis_count || 0,
        level: 0,
        type: 'university',
        children: (u.children || []).map((f) => ({
          id: f.id,
          label: f.name_fr,
          count: f.thesis_count || 0,
          level: 1,
          type: 'faculty',
          children: (f.children || []).map((d) => ({
            id: d.id,
            label: d.name_fr,
            count: d.thesis_count || 0,
            level: 2,
            type: 'department',
          })),
        })),
      }));
      setNodes(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to load tree');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const toolbar = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <button className="btn-primary inline-flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
        <button className="btn-secondary inline-flex items-center gap-2 text-sm">
          <Pencil className="w-4 h-4" />
          Modifier
        </button>
        <button className="inline-flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg">
          <Trash2 className="w-4 h-4" />
          Supprimer
        </button>
      </div>
    ),
    []
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Universités → Facultés → Départements</h2>
          {toolbar}
        </div>
        <div className="bg-white border border-gray-200 rounded-lg">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement…</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : (
            <TreeView nodes={nodes} />
          )}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
        <UniversitiesCrud />
      </div>
    </div>
  );
};

export default InstitutionsManager;

