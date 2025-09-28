import React, { useState } from 'react';
import { Eye, Plus, Edit, Trash2, Settings } from 'lucide-react';
import TreeView from './TreeView';
import { TreeNode, TreeContextMenuAction } from '../../../types/tree';

// Example usage of TreeView with Context Menu
const TreeViewExample: React.FC = () => {
  const [nodes] = useState<TreeNode[]>([
    {
      id: '1',
      label: 'Université Mohammed V',
      type: 'university',
      level: 0,
      count: 150,
      children: [
        {
          id: '2',
          label: 'Faculté des Sciences',
          type: 'faculty',
          level: 1,
          count: 75,
          children: [
            {
              id: '3',
              label: 'Département Informatique',
              type: 'department',
              level: 2,
              count: 25
            }
          ]
        }
      ]
    }
  ]);

  // Custom context menu actions
  const customContextMenuActions: TreeContextMenuAction[] = [
    {
      key: 'view',
      label: 'Voir les détails',
      icon: Eye
    },
    {
      key: 'add',
      label: 'Ajouter un sous-élément',
      icon: Plus
    },
    {
      key: 'edit',
      label: 'Modifier',
      icon: Edit
    },
    {
      key: 'settings',
      label: 'Paramètres',
      icon: Settings,
      divider: true
    },
    {
      key: 'delete',
      label: 'Supprimer',
      icon: Trash2,
      divider: true
    }
  ];

  const handleNodeView = (node: TreeNode) => {
    console.log('View node:', node.label);
    alert(`Affichage des détails de: ${node.label}`);
  };

  const handleNodeAdd = (node: TreeNode) => {
    console.log('Add child to node:', node.label);
    alert(`Ajout d'un sous-élément à: ${node.label}`);
  };

  const handleNodeEdit = (node: TreeNode) => {
    console.log('Edit node:', node.label);
    alert(`Modification de: ${node.label}`);
  };

  const handleNodeDelete = (node: TreeNode) => {
    console.log('Delete node:', node.label);
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${node.label}" ?`)) {
      alert(`${node.label} a été supprimé`);
    }
  };

  const handleNodeSelect = (node: TreeNode, isMultiSelect?: boolean) => {
    console.log('Selected node:', node.label, 'Multi-select:', isMultiSelect);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">TreeView avec Menu Contextuel</h1>
      
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-4">
          <strong>Instructions:</strong><br/>
          • Clic droit sur un nœud pour afficher le menu contextuel<br/>
          • Utilisez Shift+F10 ou la touche Menu du clavier pour le menu contextuel<br/>
          • Naviguez dans le menu avec les flèches et Entrée
        </p>
        
        <TreeView
          nodes={nodes}
          showContextMenu={true}
          contextMenuActions={customContextMenuActions}
          onNodeView={handleNodeView}
          onNodeAdd={handleNodeAdd}
          onNodeEdit={handleNodeEdit}
          onNodeDelete={handleNodeDelete}
          onNodeSelect={handleNodeSelect}
          showCounts={true}
          showIcons={true}
          searchable={true}
          maxHeight="400px"
        />
      </div>

      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Fonctionnalités du Menu Contextuel</h2>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>✅ <strong>Clic droit</strong> - Affiche le menu contextuel</li>
          <li>✅ <strong>Positionnement intelligent</strong> - Évite les bords de l'écran</li>
          <li>✅ <strong>Navigation clavier</strong> - Flèches haut/bas, Entrée, Échap</li>
          <li>✅ <strong>Actions personnalisables</strong> - Voir, Ajouter, Modifier, Supprimer</li>
          <li>✅ <strong>Icônes et séparateurs</strong> - Interface claire et intuitive</li>
          <li>✅ <strong>Fermeture automatique</strong> - Clic à l'extérieur ou Échap</li>
        </ul>
      </div>
    </div>
  );
};

export default TreeViewExample;