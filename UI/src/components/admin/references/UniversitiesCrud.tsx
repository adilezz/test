import React, { useEffect, useMemo, useState } from 'react';
import { UniversityResponse, UniversityCreate, UniversityUpdate, PaginatedResponse } from '../../../types/api';
import apiService, { ApiError } from '../../../services/api';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

const emptyForm: UniversityCreate = {
  name_fr: '',
  name_en: '',
  name_ar: '',
  acronym: '',
  geographic_entities_id: undefined,
};

const UniversitiesCrud: React.FC = () => {
  const [items, setItems] = useState<UniversityResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState<UniversityCreate>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.adminList<PaginatedResponse>('universities', { page, limit });
      setItems(res.data as UniversityResponse[]);
      setTotal(res.meta.total);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load universities';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (u: UniversityResponse) => {
    setEditingId(u.id);
    setForm({
      name_fr: u.name_fr,
      name_en: u.name_en,
      name_ar: u.name_ar,
      acronym: u.acronym,
      geographic_entities_id: u.geographic_entities_id,
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name_fr.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await apiService.adminUpdate('universities', editingId, form as UniversityUpdate);
      } else {
        await apiService.adminCreate('universities', form as UniversityCreate);
      }
      await load();
      resetForm();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to save university';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cette université ?')) return;
    setSaving(true);
    setError(null);
    try {
      await apiService.adminDelete('universities', id);
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to delete university';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold text-gray-900">Universités</h3>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
        <input
          className="input-field md:col-span-2"
          placeholder="Nom (fr)"
          value={form.name_fr}
          onChange={(e) => setForm({ ...form, name_fr: e.target.value })}
          required
        />
        <input className="input-field" placeholder="Nom (en)" value={form.name_en || ''} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
        <input className="input-field" placeholder="Nom (ar)" value={form.name_ar || ''} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
        <input className="input-field" placeholder="Sigle" value={form.acronym || ''} onChange={(e) => setForm({ ...form, acronym: e.target.value })} />
        <div className="md:col-span-5 flex items-center gap-2">
          <button type="submit" className="btn-primary inline-flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Mettre à jour' : 'Ajouter'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary">Annuler</button>
          )}
          {error && <div className="text-red-600 text-sm ml-auto">{error}</div>}
        </div>
      </form>

      <div className="overflow-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="text-left p-3">Nom (fr)</th>
              <th className="text-left p-3">Sigle</th>
              <th className="text-left p-3">Créée</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-6 text-center text-gray-500">Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="p-6 text-center text-gray-500">Aucune université</td></tr>
            ) : (
              items.map((u) => (
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-3">{u.name_fr}</td>
                  <td className="p-3">{u.acronym}</td>
                  <td className="p-3">{new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="p-3 text-right">
                    <button className="btn-ghost inline-flex items-center gap-1 mr-2" onClick={() => startEdit(u)}>
                      <Pencil className="w-4 h-4" /> Modifier
                    </button>
                    <button className="inline-flex items-center gap-1 text-red-600 hover:bg-red-50 px-2 py-1 rounded" onClick={() => remove(u.id)}>
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>Total: {total.toLocaleString()}</div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Précédent</button>
          <span>{page} / {pages}</span>
          <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Suivant</button>
        </div>
      </div>
    </div>
  );
};

export default UniversitiesCrud;

