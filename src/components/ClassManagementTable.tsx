import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from '../supabaseClient.tsx';
import Papa from 'papaparse';

interface Class {
  class_id: string;
  name: string;
  description: string;
  creator_id: string;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const ClassManagementTable: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newClass, setNewClass] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [importingClassId, setImportingClassId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/classes`);
      setClasses(res.data.classes);
      setError(null);
    } catch (err: any) {
      setError('Failed to fetch classes');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Get the real creator_id from Supabase auth
      const { data } = await supabase.auth.getUser();
      const creator_id = data.user?.id;
      if (!creator_id) throw new Error('No logged in user');
      await axios.post(`${API_BASE}/classes`, { ...newClass, creator_id });
      setNewClass({ name: '', description: '' });
      fetchClasses();
    } catch {
      setError('Failed to create class');
    }
  };

  const handleEdit = (classItem: Class) => {
    setEditingId(classItem.class_id);
    setEditFields({ name: classItem.name, description: classItem.description });
  };

  const handleUpdate = async (class_id: string) => {
    try {
      await axios.patch(`${API_BASE}/classes/${class_id}`, editFields);
      setEditingId(null);
      fetchClasses();
    } catch {
      setError('Failed to update class');
    }
  };

  const handleDelete = async (class_id: string) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await axios.delete(`${API_BASE}/classes/${class_id}`);
      fetchClasses();
    } catch {
      setError('Failed to delete class');
    }
  };

  const handleImportClick = (class_id: string) => {
    setImportingClassId(class_id);
    setImportResult(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importingClassId) return;
    Papa.parse(file, {
      header: true,
      complete: async (results: any) => {
        // Extract only Student Name and Email
        const students = (results.data || [])
          .map((row: any) => ({
            name: row['Student Name']?.trim(),
            email: row['Email']?.trim(),
          }))
          .filter((s: any) => s.name && s.email);
        try {
          const res = await axios.post(`${API_BASE}/import-students`, { students, class_id: importingClassId });
          setImportResult(res.data);
        } catch (err: any) {
          setImportResult({ error: err?.response?.data?.error || 'Import failed' });
        }
      }
    });
    // Reset input so same file can be uploaded again
    e.target.value = '';
  };

  const fetchRoster = async (class_id: string) => {
    setRosterLoading(true);
    setRosterError(null);
    try {
      const res = await axios.get(`${API_BASE}/classes/${class_id}/students`);
      setRoster(res.data.students || []);
    } catch (err: any) {
      setRosterError('Failed to fetch roster');
      setRoster([]);
    }
    setRosterLoading(false);
  };

  const handleShowRoster = (class_id: string) => {
    setSelectedClassId(class_id);
    fetchRoster(class_id);
  };

  return (
    <div>
      <h2>Classes</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <form onSubmit={handleCreate} style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Class Name"
          value={newClass.name}
          onChange={e => setNewClass({ ...newClass, name: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Description"
          value={newClass.description}
          onChange={e => setNewClass({ ...newClass, description: e.target.value })}
        />
        <button type="submit">Add Class</button>
      </form>
      <input
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      {loading ? (
        <div>Loading...</div>
      ) : (
        <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Created At</th>
              <th>Actions</th>
              <th>Import</th>
              <th>Roster</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(classItem => (
              <tr key={classItem.class_id}>
                <td>
                  {editingId === classItem.class_id ? (
                    <input
                      value={editFields.name}
                      onChange={e => setEditFields({ ...editFields, name: e.target.value })}
                    />
                  ) : (
                    classItem.name
                  )}
                </td>
                <td>
                  {editingId === classItem.class_id ? (
                    <input
                      value={editFields.description}
                      onChange={e => setEditFields({ ...editFields, description: e.target.value })}
                    />
                  ) : (
                    classItem.description
                  )}
                </td>
                <td>{new Date(classItem.created_at).toLocaleString()}</td>
                <td>
                  {editingId === classItem.class_id ? (
                    <>
                      <button onClick={() => handleUpdate(classItem.class_id)}>Save</button>
                      <button onClick={() => setEditingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEdit(classItem)}>Edit</button>
                      <button onClick={() => handleDelete(classItem.class_id)}>Delete</button>
                    </>
                  )}
                </td>
                <td>
                  <button onClick={() => handleImportClick(classItem.class_id)}>Import Students</button>
                  {importingClassId === classItem.class_id && importResult && (
                    <div style={{ maxWidth: 300, fontSize: 12 }}>
                      {importResult.error ? (
                        <span style={{ color: 'red' }}>{importResult.error}</span>
                      ) : (
                        <span style={{ color: 'green' }}>Imported: {importResult.results?.length || 0} students.</span>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <button onClick={() => handleShowRoster(classItem.class_id)}>
                    {selectedClassId === classItem.class_id ? 'Hide Roster' : 'Show Roster'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {selectedClassId && (
        <div style={{ marginTop: 32 }}>
          <h3>Class Roster</h3>
          {rosterLoading ? (
            <div>Loading roster...</div>
          ) : rosterError ? (
            <div style={{ color: 'red' }}>{rosterError}</div>
          ) : roster.length === 0 ? (
            <div>No students found.</div>
          ) : (
            <table border={1} cellPadding={8} style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((student: any) => (
                  <tr key={student.user_id}>
                    <td>{student.full_name || student.name || ''}</td>
                    <td>{student.email}</td>
                    <td>{student.status || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassManagementTable;
