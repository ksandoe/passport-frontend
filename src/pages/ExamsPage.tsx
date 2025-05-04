import React from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AssignExamDialog from '../components/AssignExamDialog';
import NewExamDialog from '../components/NewExamDialog';
import QtiImportDialog from '../components/QtiImportDialog';
import axios from 'axios';
import { supabase } from '../supabaseClient.tsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ExamsPage: React.FC = () => {
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [selectedExam, setSelectedExam] = React.useState<string | null>(null);
  const [exams, setExams] = React.useState<any[]>([]);
  const [newExamOpen, setNewExamOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [qtiImportOpen, setQtiImportOpen] = React.useState(false);
  const [qtiImportExamId, setQtiImportExamId] = React.useState<string | null>(null);
  const [editExam, setEditExam] = React.useState<any | null>(null);

  React.useEffect(() => {
    async function fetchUserId() {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id || null);
    }
    fetchUserId();
  }, []);

  React.useEffect(() => {
    if (currentUserId) {
      fetchExams();
    }
    // eslint-disable-next-line
  }, [currentUserId]);

  const fetchExams = async () => {
    if (!currentUserId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE_URL}/exams`, { params: { creator_id: currentUserId } });
      setExams(res.data.exams || []);
    } catch (err: any) {
      setError('Failed to load exams.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssign = (examId: string) => {
    setSelectedExam(examId);
    setAssignOpen(true);
  };
  const handleCloseAssign = () => {
    setAssignOpen(false);
    setSelectedExam(null);
  };
  const handleAssign = (classId: string, availableAt: string, endAt: string) => {
    // TODO: Call backend API to assign selectedExam to classId
    alert(`Assign exam ${selectedExam} to class ${classId} from ${availableAt} to ${endAt}`);
    handleCloseAssign();
  };

  // New Exam Dialog handlers
  const handleOpenNewExam = () => setNewExamOpen(true);
  const handleCloseNewExam = () => setNewExamOpen(false);
  const handleCreateExam = async (exam: { title: string; instructions: string; duration_minutes: number; max_attempts: number }) => {
    if (!currentUserId) return;
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE_URL}/exams`, { ...exam, creator_id: currentUserId });
      setNewExamOpen(false);
      fetchExams();
      // After exam creation, open QTI import dialog with new exam_id
      const newExamId = res.data.exam?.exam_id || res.data.exam_id || res.data.examId || (res.data.exams && res.data.exams[0]?.exam_id);
      if (newExamId) {
        setQtiImportExamId(newExamId);
        setQtiImportOpen(true);
      }
    } catch (err: any) {
      setError('Failed to create exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleQtiImportClose = () => {
    setQtiImportOpen(false);
    setQtiImportExamId(null);
  };

  const handleQtiImportSuccess = (result: { imported: number; errors: string[] }) => {
    fetchExams(); // reload exams in case questions count is displayed elsewhere
  };

  const handleEditExam = (exam: any) => setEditExam(exam);
  const handleCloseEditExam = () => setEditExam(null);
  const handleUpdateExam = async (updatedExam: { title: string; instructions: string; duration_minutes: number; max_attempts: number }) => {
    if (!currentUserId || !editExam) return;
    setLoading(true);
    setError('');
    try {
      await axios.patch(`${API_BASE_URL}/exams/${editExam.exam_id}`, updatedExam);
      handleCloseEditExam();
      fetchExams();
    } catch (err: any) {
      setError('Failed to update exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) return;
    setLoading(true);
    setError('');
    try {
      await axios.delete(`${API_BASE_URL}/exams/${examId}`);
      fetchExams();
    } catch (err: any) {
      setError('Failed to delete exam.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Exams</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNewExam}>New Exam</Button>
      </Box>
      {error && <Box color="error.main" mb={2}>{error}</Box>}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Instructions</TableCell>
              <TableCell>Duration (min)</TableCell>
              <TableCell>Max Attempts</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6}>Loading...</TableCell></TableRow>
            ) : (
              exams.map((exam) => (
                <TableRow key={exam.exam_id}>
                  <TableCell>{exam.title}</TableCell>
                  <TableCell>{exam.instructions}</TableCell>
                  <TableCell>{exam.duration_minutes}</TableCell>
                  <TableCell>{typeof exam.max_attempts === 'number' ? (exam.max_attempts === 0 ? 'Unlimited' : exam.max_attempts ?? '—') : '—'}</TableCell>
                  <TableCell>{exam.created_at ? new Date(exam.created_at).toLocaleString() : '—'}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleEditExam(exam)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => handleDeleteExam(exam.exam_id)}>Delete</Button>
                    <Button size="small" color="primary" startIcon={<AssignmentIndIcon />} onClick={() => handleOpenAssign(exam.exam_id)}>
                      Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <AssignExamDialog
        open={assignOpen}
        onClose={handleCloseAssign}
        onAssign={(success) => {
          handleCloseAssign();
          if (success) fetchExams();
        }}
        examId={selectedExam}
      />
      <NewExamDialog open={newExamOpen} onClose={handleCloseNewExam} onCreate={handleCreateExam} />
      {editExam && (
        <NewExamDialog
          open={!!editExam}
          onClose={handleCloseEditExam}
          onCreate={handleUpdateExam}
          title={editExam.title}
          instructions={editExam.instructions}
          duration_minutes={editExam.duration_minutes}
          max_attempts={editExam.max_attempts}
        />
      )}
      <QtiImportDialog open={qtiImportOpen} onClose={handleQtiImportClose} examId={qtiImportExamId || ''} onSuccess={handleQtiImportSuccess} />
    </Box>
  );
};

export default ExamsPage;
