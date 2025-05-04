import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress } from '@mui/material';
import { useAuth } from '../supabaseClient.tsx';
import { DateTime } from 'luxon';

// Placeholder: Replace with actual API endpoint and user context
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Exam {
  assignment_id: string;
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
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [loadingExamId, setLoadingExamId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const fetchExams = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/assignments?user_id=${user.id}`);
        if (!res.ok) throw new Error('Failed to fetch exams');
        const data = await res.json();
        setExams(data.assignments || []);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, [user]);

  const getStatus = (exam: Exam) => {
    const now = new Date();
    const available = new Date(exam.available_at);
    const end = new Date(exam.end_at);
    if (now < available) return 'upcoming';
    if (now >= available && now <= end) return 'active';
    return 'completed';
  };

  const handleStartExam = async (examId: string) => {
    setLoadingExamId(examId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/exam/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          exam_id: examId,
          device_info: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to get exam token');
        setLoadingExamId(null);
        return;
      }
      const token = data.token;

      // Launch the renderer with the token
      if (window.electronAPI && window.electronAPI.launchExam) {
        window.electronAPI.launchExam(user.id, examId, token);
      } else {
        // Fallback: Use custom protocol for production
        window.location.href = `passport-renderer://start-exam?token=${encodeURIComponent(token)}`;
      }
    } catch (err) {
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
              {exams.map(exam => {
                const status = getStatus(exam);
                const now = new Date();
                const available = new Date(exam.available_at);
                const end = new Date(exam.end_at);
                const attempts = typeof exam.attempts === 'number' ? exam.attempts : 0;
                const maxAttempts = typeof exam.max_attempts === 'number' ? exam.max_attempts : undefined;
                let actionContent;
                if (now < available) {
                  actionContent = <Typography variant="body2">Exam not yet available</Typography>;
                } else if (now > end) {
                  actionContent = <Typography variant="body2">Exam deadline expired</Typography>;
                } else {
                  // In available window
                  if (maxAttempts === 0 || attempts < (maxAttempts ?? 1)) {
                    actionContent = (
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => handleStartExam(exam.assignment_id)}
                        disabled={loadingExamId === exam.assignment_id}
                      >
                        {loadingExamId === exam.assignment_id ? 'Starting...' : 'Start Exam'}
                      </Button>
                    );
                  } else {
                    actionContent = <Typography variant="body2">No more attempts</Typography>;
                  }
                }
                return (
                  <TableRow key={exam.assignment_id}>
                    <TableCell>{exam.title || <em style={{color:'red'}}>Missing title</em>}</TableCell>
                    <TableCell>{DateTime.fromISO(exam.available_at).setZone('America/Los_Angeles').toLocaleString(DateTime.DATETIME_MED)}</TableCell>
                    <TableCell>{DateTime.fromISO(exam.end_at).setZone('America/Los_Angeles').toLocaleString(DateTime.DATETIME_MED)}</TableCell>
                    <TableCell>{typeof exam.max_attempts === 'number' ? (exam.max_attempts === 0 ? 'Unlimited' : exam.max_attempts) : '—'}</TableCell>
                    <TableCell>{status === 'completed' && typeof exam.score === 'number' ? exam.score : '-'}</TableCell>
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
