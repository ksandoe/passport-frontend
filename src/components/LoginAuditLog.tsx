import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert } from '@mui/material';

// TODO: Replace with actual API call or Supabase query
const mockFetchAuditLog = async () => {
  // Simulate network delay
  await new Promise(res => setTimeout(res, 700));
  // Return mock data
  return [
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      email: 'user@example.com',
      status: 'Success',
      ip: '192.168.1.1',
      reason: 'Login successful',
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      email: 'user@example.com',
      status: 'Failed',
      ip: '192.168.1.1',
      reason: 'Invalid code',
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      email: 'user@example.com',
      status: 'Locked out',
      ip: '192.168.1.1',
      reason: 'Too many failed attempts',
    },
  ];
};

const LoginAuditLog: React.FC = () => {
  const [log, setLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    mockFetchAuditLog()
      .then(data => { if (mounted) setLog(data); })
      .catch(err => { if (mounted) setError('Failed to load audit log'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <Box mt={4}>
      <Typography variant="h6" mb={1}>Recent Login Attempts</Typography>
      {loading ? (
        <CircularProgress size={24} />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : log.length === 0 ? (
        <Typography variant="body2">No recent login attempts found.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>IP</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {log.map((entry, idx) => (
                <TableRow key={idx}>
                  <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                  <TableCell>{entry.email}</TableCell>
                  <TableCell>{entry.status}</TableCell>
                  <TableCell>{entry.ip}</TableCell>
                  <TableCell>{entry.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default LoginAuditLog;
