import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import TreeView from '../../ui/TreeView/TreeView';
import { TreeNode } from '../../../types/tree';
import apiService from '../../../services/api';

const CategoriesManager: React.FC = () => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTree = async () => {
    setLoading(true);
    setError(null);
    try {
      const tree = await apiService.getCategoriesTree(false, 0);
      const toNodes = (items: any[], level: number): TreeNode[] =>
        (items || []).map((n) => ({
          id: n.id,
          label: n.name_fr,
          count: n.thesis_count || 0,
          level,
          type: level === 0 ? 'discipline' : level === 1 ? 'subdiscipline' : 'category',
          children: toNodes(n.children || [], level + 1),
        }));
      setNodes(toNodes(tree, 0));
    } catch (e: any) {
      setError(e?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Disciplines → Sous-disciplines → Spécialités</h2>
          <div className="flex items-center gap-2">
            <button className="btn-primary inline-flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />Ajouter</button>
            <button className="btn-secondary inline-flex items-center gap-2 text-sm"><Pencil className="w-4 h-4" />Modifier</button>
            <button className="inline-flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg"><Trash2 className="w-4 h-4" />Supprimer</button>
          </div>
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
        <div className="text-gray-500 text-sm">Sélectionnez une catégorie pour gérer ses détails.</div>
      </div>
    </div>
  );
};

export default CategoriesManager;

