import React from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import UserManagementTable from '../components/UserManagementTable';

const AdminPage: React.FC = () => {
  // Only two tabs: Users and Settings (Settings as placeholder)
  const [tab, setTab] = React.useState(0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Users" />
        <Tab label="Settings" />
      </Tabs>
      {tab === 0 && <UserManagementTable />}
      {tab === 1 && <Typography>System settings coming soon...</Typography>}
    </Box>
  );
};

export default AdminPage;
