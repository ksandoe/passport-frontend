import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';
import { useAuth } from '../supabaseClient.tsx';
import { DateTime } from 'luxon';

// Placeholder: Replace with actual API endpoint and user context
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Assignment {
  assignment_id: string;
  exam_id: string;
  user_id: string;
  title: string;
  instructions?: string;
  assigned_at: string;
  available_from: string;
  available_until: string;
  status: 'upcoming' | 'active' | 'completed' | string;
  score?: number;
  max_attempts?: number;
  attempts?: number;
  scoring_method?: string;
  duration_minutes?: number;
}

// Add Electron API typing for TypeScript
// (window.electronAPI is injected by Electron preload script)
declare global {
  interface Window {
    electronAPI?: {
      launchExam: (userId: string, examId: string, token: string) => void;
    };
  }
}

const StudentPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();


  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const fetchAssignments = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/assignments?user_id=${user.id}`);
        if (!res.ok) throw new Error('Failed to fetch exams');
        const data = await res.json();
        setAssignments(data.assignments || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [user]);

  const getStatus = (assignment: Assignment) => {
    const now = new Date();
    const available = new Date(assignment.available_from);
    const end = new Date(assignment.available_until);
    const attempts = assignment.attempts ?? 0;
    const maxAttempts = assignment.max_attempts ?? 0;
    if (now < available) return 'upcoming';
    if (now >= available && now <= end) {
      // Check attempt limits
      if (
        maxAttempts > 0 &&
        attempts >= maxAttempts
      ) {
        return 'exhausted';
      }
      return 'active';
    }
    return 'completed';
  };


  const handleStartExam = async (assignment: Assignment) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Optionally collect device info
      const device_info = navigator.userAgent;
      const res = await fetch(`${API_BASE_URL}/api/exam/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          assignment_id: assignment.assignment_id,
          exam_id: assignment.exam_id,
          device_info,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start exam');
        alert(data.error || 'Failed to start exam');
        return;
      }
      const { token } = data;
      // Launch the Electron renderer with the token
      if (window.electronAPI && window.electronAPI.launchExam) {
        window.electronAPI.launchExam(user.id, assignment.exam_id, token);
      } else {
        // Fallback: Use custom protocol for production
        window.location.href = `passport://start?token=${encodeURIComponent(token)}`;
      }
    } catch (err) {
      setError((err as Error).message);
      alert('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Student Portal</Typography>
      <Typography gutterBottom>Welcome! Here you can view your assigned exams and results.</Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Exam Title</TableCell>
                <TableCell>Available From</TableCell>
                <TableCell>Available Until</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Max Attempts</TableCell>
                <TableCell>Attempts</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map(assignment => {
                const status = getStatus(assignment);
                const now = new Date();
                const available = new Date(assignment.available_from);
                const end = new Date(assignment.available_until);
                const attempts = typeof assignment.attempts === 'number' ? assignment.attempts : 0;
                const maxAttempts = typeof assignment.max_attempts === 'number' ? assignment.max_attempts : undefined;
                let actionContent;
                if (now < available) {
                  actionContent = <Typography variant="body2">Exam not yet available</Typography>;
                } else if (now > end) {
                  actionContent = <Typography variant="body2">Exam deadline expired</Typography>;
                } else {
                  // In available window
                  if (maxAttempts === 0 || attempts < (maxAttempts ?? 1)) {
                    actionContent = (
                      <div>
                        {status === 'exhausted' ? (
                          <div style={{ color: 'red', fontWeight: 'bold' }}>
                            You have used all allowed attempts for this exam.
                          </div>
                        ) : (
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleStartExam(assignment)}
                            disabled={status !== 'active'}
                          >
                            Start Exam
                          </Button>
                        )}
                      </div>
                    );
                  } else {
                    actionContent = <Typography variant="body2">No more attempts</Typography>;
                  }
                }
                return (
                  <TableRow key={assignment.assignment_id}>
                    <TableCell>{assignment.title || <em style={{color:'red'}}>Missing title</em>}</TableCell>
                    <TableCell>{DateTime.fromISO(assignment.available_from).setZone('America/Los_Angeles').toLocaleString(DateTime.DATETIME_MED)}</TableCell>
                    <TableCell>{DateTime.fromISO(assignment.available_until).setZone('America/Los_Angeles').toLocaleString(DateTime.DATETIME_MED)}</TableCell>
                    <TableCell>{typeof assignment.duration_minutes === 'number' && assignment.duration_minutes > 0 ? `${assignment.duration_minutes} min` : '—'}</TableCell>
                    <TableCell>{typeof assignment.max_attempts === 'number' ? (assignment.max_attempts === 0 ? 'Unlimited' : assignment.max_attempts) : '—'}</TableCell>
                    <TableCell>{typeof assignment.attempts === 'number' ? assignment.attempts : 0}{typeof assignment.max_attempts === 'number' && assignment.max_attempts > 0 ? ` / ${assignment.max_attempts}` : ''}</TableCell>
                    <TableCell>{typeof assignment.score === 'number' ? assignment.score : '-'}</TableCell>
                    <TableCell>{actionContent}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default StudentPage;
