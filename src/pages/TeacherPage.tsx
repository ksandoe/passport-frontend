import React from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import ExamsPage from './ExamsPage';
import ClassManagementTable from '../components/ClassManagementTable';

const TeacherPage: React.FC = () => {
  const [tab, setTab] = React.useState(0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
        Teacher Dashboard
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Classes" />
        <Tab label="Exams" />
      </Tabs>
      {tab === 0 && <ClassManagementTable />}
      {tab === 1 && <ExamsPage />}
    </Box>
  );
};

export default TeacherPage;
