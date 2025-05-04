import React from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Button, Select, MenuItem, CircularProgress
} from '@mui/material';

const roles = ['student', 'teacher', 'admin'];

const UserManagementTable: React.FC = () => {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    fetch(`${import.meta.env.VITE_API_BASE_URL}/users`)
      .then(res => res.json())
      .then(data => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch users');
        setLoading(false);
      });
  }, []);

  const handleRoleChange = async (id: string, newRole: string) => {
    const prevUsers = [...users];
    setUsers(users => users.map(u => u.id === id ? { ...u, role: newRole } : u));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error();
    } catch {
      setUsers(prevUsers); // revert
      setError('Failed to update role');
    }
  };

  const handleStatusToggle = async (id: string) => {
    const user = users.find(u => u.id === id);
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    const prevUsers = [...users];
    setUsers(users => users.map(u => u.id === id ? { ...u, status: newStatus } : u));
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/users/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error();
    } catch {
      setUsers(prevUsers); // revert
      setError('Failed to update status');
    }
  };

  if (loading) return <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}><CircularProgress /></Box>;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>User Management</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Select
                    value={user.role || 'student'}
                    onChange={e => handleRoleChange(user.id, e.target.value as string)}
                    size="small"
                  >
                    {roles.map(role => (
                      <MenuItem value={role} key={role}>{role}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>{user.status || 'active'}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant={user.status === 'active' ? 'outlined' : 'contained'}
                    color={user.status === 'active' ? 'error' : 'success'}
                    onClick={() => handleStatusToggle(user.id)}
                  >
                    {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UserManagementTable;
