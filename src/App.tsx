import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LogoutIcon from '@mui/icons-material/Logout';
import IconButton from '@mui/material/IconButton';
import AdminPage from './pages/AdminPage';
import StudentPage from './pages/StudentPage';
import TeacherPage from './pages/TeacherPage';
import { supabase } from './supabaseClient';
import LoginPage from './pages/LoginPage';

const drawerWidth = 220;

const roleThemes: Record<string, any> = {
  teacher: createTheme({ palette: { primary: { main: '#1976d2' } } }), // Blue
  admin: createTheme({ palette: { primary: { main: '#c62828' } } }),   // Red
  student: createTheme({ palette: { primary: { main: '#2e7d32' } } }), // Green
  default: createTheme(),
};

function App() {
  const [selected, setSelected] = React.useState('Dashboard');
  const [user, setUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [role, setRole] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch user role from backend API instead of Supabase
  React.useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    setRole(null);
    setLoading(true);
    // Fetch the user's profile from the backend
    fetch(`${import.meta.env.VITE_API_BASE_URL}/profile?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        setRole(data.profile?.role || 'student');
        setLoading(false);
      })
      .catch(() => {
        setRole('student');
        setLoading(false);
      });
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  if (loading) return null;
  if (!user) {
    return <LoginPage onLogin={async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }} />;
  }
  if (!role) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><Typography>Loading role...</Typography></Box>;
  }

  // Routing based on role
  let MainContent;
  if (role === 'teacher') {
    MainContent = <TeacherPage />;
  } else if (role === 'admin') {
    MainContent = <AdminPage />;
  } else {
    MainContent = <StudentPage />;
  }

  // Use themed color for AppBar based on role
  const theme = roleThemes[role] || roleThemes.default;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} color="primary">
          <Toolbar>
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              {role === 'teacher' && 'Passport Teacher Dashboard'}
              {role === 'admin' && 'Passport Admin Dashboard'}
              {role === 'student' && 'Passport Student Portal'}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout} title="Logout">
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        {(role === 'teacher') && false && (
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
            }}
          >
            <Toolbar />
            <Box sx={{ overflow: 'auto' }}>
              <List>
                <ListItem disablePadding>
                  <ListItemButton selected={selected === 'Dashboard'} onClick={() => setSelected('Dashboard')}>
                    <ListItemIcon><DashboardIcon /></ListItemIcon>
                    <ListItemText primary="Dashboard" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton selected={selected === 'Exams'} onClick={() => setSelected('Exams')}>
                    <ListItemIcon><AssignmentIcon /></ListItemIcon>
                    <ListItemText primary="Exams" />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton selected={selected === 'Classes'} onClick={() => setSelected('Classes')}>
                    <ListItemIcon><SchoolIcon /></ListItemIcon>
                    <ListItemText primary="Classes" />
                  </ListItemButton>
                </ListItem>
              </List>
            </Box>
          </Drawer>
        )}
        <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}>
          <Toolbar />
          {MainContent}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
