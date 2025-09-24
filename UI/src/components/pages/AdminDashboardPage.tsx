import React, { useMemo, useState } from 'react';
import { Building2, School, Layers3, Settings, LibraryBig, Tag, Languages, Users2 } from 'lucide-react';
import InstitutionsManager from '../admin/references/InstitutionsManager';
import SchoolsManager from '../admin/references/SchoolsManager';
import CategoriesManager from '../admin/references/CategoriesManager';

type AdminTabKey = 'institutions' | 'schools' | 'categories' | 'keywords' | 'degrees' | 'languages' | 'persons' | 'settings';

const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTabKey>('institutions');

  const tabs = useMemo(
    () => [
      { key: 'institutions', label: 'Universités & Facultés', icon: Building2 },
      { key: 'schools', label: 'Écoles & Départements', icon: School },
      { key: 'categories', label: 'Disciplines & Catégories', icon: Layers3 },
      { key: 'keywords', label: 'Mots-clés', icon: Tag },
      { key: 'degrees', label: 'Diplômes', icon: LibraryBig },
      { key: 'languages', label: 'Langues', icon: Languages },
      { key: 'persons', label: 'Personnes académiques', icon: Users2 },
      { key: 'settings', label: 'Paramètres', icon: Settings },
    ] as Array<{ key: AdminTabKey; label: string; icon: React.FC<any> }>,
    []
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-600 mt-2">Gestion des références, taxonomies et thèses</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="border-b border-gray-200 px-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors duration-150 ${
                    activeTab === key
                      ? 'text-primary-700 border-primary-600'
                      : 'text-gray-600 border-transparent hover:text-primary-700 hover:border-primary-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'institutions' && <InstitutionsManager />}
            {activeTab === 'schools' && <SchoolsManager />}
            {activeTab === 'categories' && <CategoriesManager />}
            {activeTab !== 'institutions' && activeTab !== 'schools' && activeTab !== 'categories' && (
              <div className="p-8 text-center text-gray-500">Module en cours d'implémentation…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

