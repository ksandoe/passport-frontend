import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';
import { useAuth } from '../supabaseClient.tsx';
import { DateTime } from 'luxon';

// Placeholder: Replace with actual API endpoint and user context
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Assignment {
  assignment_id: string;
  exam_id: string;
  title: string;
  available_at: string;
  end_at: string;
  status: 'upcoming' | 'active' | 'completed';
  score?: number;
  max_attempts?: number;
  attempts?: number;
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
  const [loadingExamId, setLoadingExamId] = useState<string | null>(null);

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
    const available = new Date(assignment.available_at);
    const end = new Date(assignment.end_at);
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
    setLoadingExamId(assignment.assignment_id);
    try {
      console.log('Attempting to start exam with:', { userId: user.id, examId: assignment.exam_id, assignmentId: assignment.assignment_id });
      const res = await fetch(`${API_BASE_URL}/api/exam/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          exam_id: assignment.exam_id,
        }),
      });
      const data = await res.json();
      console.log('API response:', res);
      console.log('API response data:', data);
      if (!res.ok) {
        console.error('Failed to get exam token:', data);
        alert(data.error || 'Failed to get exam token');
        setLoadingExamId(null);
        return;
      }
      const token = data.token;

      // Launch the Electron renderer with the token
      window.location.href = `passport://start?token=${encodeURIComponent(token)}`;

      // Launch the renderer with the token
      if (window.electronAPI && window.electronAPI.launchExam) {
        window.electronAPI.launchExam(user.id, assignment.exam_id, token);
      } else {
        // Fallback: Use custom protocol for production
        // window.location.href = `passport-renderer://start-exam?token=${encodeURIComponent(token)}`;
      }
    } catch (err) {
      console.error('Exception when starting exam:', err);
      alert('Error: ' + (err as Error).message);
    } finally {
      setLoadingExamId(null);
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
                <TableCell>Max Attempts</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignments.map(assignment => {
                const status = getStatus(assignment);
                const now = new Date();
                const available = new Date(assignment.available_at);
                const end = new Date(assignment.end_at);
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
                        <div>
                          Attempts: {(assignment.attempts ?? 0)}
                          {(assignment.max_attempts ?? 0) > 0
                            ? ` / ${(assignment.max_attempts ?? 0)}`
                            : ' (unlimited)'}
                        </div>
                      </div>
                    );
                  } else {
                    actionContent = <Typography variant="body2">No more attempts</Typography>;
                  }
                }
                return (
                  <TableRow key={assignment.assignment_id}>
                    <TableCell>{assignment.title || <em style={{color:'red'}}>Missing title</em>}</TableCell>
                    <TableCell>{DateTime.fromISO(assignment.available_at).setZone('America/Los_Angeles').toLocaleString(DateTime.DATETIME_MED)}</TableCell>
                    <TableCell>{DateTime.fromISO(assignment.end_at).setZone('America/Los_Angeles').toLocaleString(DateTime.DATETIME_MED)}</TableCell>
                    <TableCell>{typeof assignment.max_attempts === 'number' ? (assignment.max_attempts === 0 ? 'Unlimited' : assignment.max_attempts) : '—'}</TableCell>
                    <TableCell>{status === 'completed' && typeof assignment.score === 'number' ? assignment.score : '-'}</TableCell>
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
