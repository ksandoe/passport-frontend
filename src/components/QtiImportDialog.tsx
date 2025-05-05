import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, LinearProgress } from '@mui/material';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface QtiImportDialogProps {
  open: boolean;
  onClose: () => void;
  examId: string;
  onSuccess?: (result: { imported: number; errors: string[] }) => void;
}

const QtiImportDialog: React.FC<QtiImportDialogProps> = ({ open, onClose, examId, onSuccess }) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [result, setResult] = React.useState<{ imported: number; errors: string[] } | null>(null);

  // Preview state for extracted files
  const [xmlFilesPreview, setXmlFilesPreview] = React.useState<{ name: string; size: number; type: string }[]>([]);
  const [mediaFilesPreview, setMediaFilesPreview] = React.useState<{ name: string; size: number; type: string }[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
      setXmlFilesPreview([]);
      setMediaFilesPreview([]);
      const zipFile = e.target.files[0];
      if (zipFile && zipFile.name.endsWith('.zip')) {
        JSZip.loadAsync(zipFile).then(zip => {
          const xmls: { name: string; size: number; type: string }[] = [];
          const medias: { name: string; size: number; type: string }[] = [];
          const promises = Object.keys(zip.files).map(async (filename) => {
            const zipEntry = zip.files[filename];
            if (zipEntry.dir) return;
            const ext = filename.split('.').pop()?.toLowerCase();
            const fileData = await zipEntry.async('blob');
            if (ext === 'xml') {
              xmls.push({ name: filename, size: fileData.size, type: 'text/xml' });
            } else if (
              ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tif', 'tiff'].includes(ext || '')
            ) {
              medias.push({ name: filename, size: fileData.size, type: fileData.type || 'application/octet-stream' });
            }
          });
          Promise.all(promises).then(() => {
            setXmlFilesPreview(xmls);
            setMediaFilesPreview(medias);
          });
        });
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a QTI ZIP file.');
      return;
    }
    if (!file.name.endsWith('.zip')) {
      setError('Only ZIP files are supported.');
      return;
    }
    setUploading(true);
    setError('');
    setResult(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const xmlFiles: { name: string; content: string }[] = [];
      const images: Record<string, Blob> = {};

      // Step 1: Extract XML and images from ZIP
      await Promise.all(
        Object.keys(zip.files).map(async (filename) => {
          const zipEntry = zip.files[filename];
          if (zipEntry.dir) return;
          const ext = filename.split('.').pop()?.toLowerCase();
          const fileData = await zipEntry.async('blob');
          if (ext === 'xml') {
            xmlFiles.push({ name: filename, content: await fileData.text() });
          } else if (
            [
              'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'tif', 'tiff'
            ].includes(ext || '')
          ) {
            images[filename] = fileData;
          }
        })
      );
      if (xmlFiles.length === 0) {
        setUploading(false);
        setError('No QTI XML files found in the ZIP.');
        return;
      }

      // Step 2.5: Upload images to backend and map filenames to URLs
      const imageUrlMap: Record<string, string> = {};
      for (const [filename, blob] of Object.entries(images)) {
        const formData = new FormData();
        formData.append('file', blob, filename);
        formData.append('exam_id', String(examId)); // Ensure examId is provided
        try {
          const res = await fetch(`${API_BASE_URL}/upload-image`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          imageUrlMap[filename] = data.url;
        } catch (err: any) {
          imageUrlMap[filename] = '';
        }
      }

      // Step 3: Parse XML and build questions
      const parser = new XMLParser();
      let questions: any[] = [];
      for (const xmlFile of xmlFiles) {
        const parsed = parser.parse(xmlFile.content);
        // QTI-compliant parsing for multiple-choice and short-answer
        const assessment = parsed?.questestinterop?.assessment;
        let items: any[] = [];
        if (assessment) {
          const sections = Array.isArray(assessment.section) ? assessment.section : [assessment.section];
          for (const section of sections) {
            const sectionItems = Array.isArray(section.item) ? section.item : [section.item];
            items.push(...sectionItems);
          }
        }
        // Fallback to previous logic if items is still empty (for other QTI flavors)
        if (items.length === 0 && parsed?.questestinterop?.item) {
          items = Array.isArray(parsed.questestinterop.item) ? parsed.questestinterop.item : [parsed.questestinterop.item];
        }
        for (const item of items) {
          // DEBUG: Log the raw item and response_label structure
          console.log('QTI RAW ITEM', JSON.stringify(item, null, 2));

          // 0. Extract original_answer_ids from metadata if present (Canvas QTI)
          let originalAnswerIds: string[] | null = null;
          if (item.itemmetadata?.qtimetadata?.qtimetadatafield) {
            const fields = Array.isArray(item.itemmetadata.qtimetadata.qtimetadatafield)
              ? item.itemmetadata.qtimetadata.qtimetadatafield
              : [item.itemmetadata.qtimetadata.qtimetadatafield];
            const orig = fields.find((f: any) => f.fieldlabel === 'original_answer_ids');
            if (orig && orig.fieldentry) {
              originalAnswerIds = orig.fieldentry.split(',');
            }
          }

          // 1. Extract prompt
          const prompt = item.presentation?.material?.mattext || '';
          let choices: string[] = [];
          let correct_answer = '';
          let type = 'short-answer';
          let image_url = '';

          // Utility to normalize image filenames from QTI src
          function normalizeImageFilename(src: string): string {
            let filename = src.replace(/^\$IMS-CC-FILEBASE\$\//, '');
            filename = filename.split('?')[0];
            return filename;
          }

          // Utility to strip HTML tags
          function stripHtml(html: string): string {
            return typeof html === 'string' ? html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() : html;
          }

          // 2. Extract choices from response_lid/render_choice/response_label
          let responseLid = item.presentation?.response_lid;
          let rawResponseLabels: any[] = [];
          let identList: any[] = [];
          if (responseLid) {
            if (!Array.isArray(responseLid)) responseLid = [responseLid];
            for (const lid of responseLid) {
              let renderChoice = lid.render_choice;
              if (renderChoice) {
                if (!Array.isArray(renderChoice)) renderChoice = [renderChoice];
                for (const rc of renderChoice) {
                  let responseLabels = rc.response_label;
                  if (responseLabels) {
                    if (!Array.isArray(responseLabels)) responseLabels = [responseLabels];
                    rawResponseLabels = responseLabels;
                    choices = responseLabels.map((label: any) => label.material?.mattext || '');
                    // Use original_answer_ids if present, otherwise fallback to ident attributes
                    if (originalAnswerIds && originalAnswerIds.length === responseLabels.length) {
                      identList = originalAnswerIds;
                    } else {
                      identList = responseLabels.map((label: any) => label['@_ident'] || label.ident || label.id || undefined);
                    }
                    if (choices.length > 0) type = 'multiple-choice';
                  }
                }
              }
            }
          }

          // DEBUG: Log the raw response_labels and identList
          console.log('QTI RAW response_labels', rawResponseLabels);
          console.log('QTI identList', identList);

          // 3. Extract correct answer for multiple-choice
          let debugInfo: any = { prompt, choices, type, correct_answer_raw: undefined, correct_answer: undefined, identList, respConditions: undefined };
          if (type === 'multiple-choice' && item.resprocessing) {
            let respConditions = item.resprocessing.respcondition;
            debugInfo.respConditions = respConditions;
            if (respConditions) {
              if (!Array.isArray(respConditions)) respConditions = [respConditions];
              for (const cond of respConditions) {
                // Map correct answer: just require varequal exists
                if (cond.conditionvar?.varequal !== undefined && cond.conditionvar?.varequal !== null) {
                  let varequal = cond.conditionvar.varequal;
                  let correctIdent = undefined;
                  if (typeof varequal === 'object') {
                    correctIdent = varequal['#text'] || varequal._ || varequal['@_ident'] || varequal.ident || undefined;
                  } else {
                    correctIdent = varequal;
                  }
                  correctIdent = String(correctIdent).trim(); // Ensure string and trim
                  debugInfo.correct_answer_raw = correctIdent;
                  let idx = -1;
                  if (identList && Array.isArray(identList)) {
                    idx = identList.findIndex(id => String(id).trim() === correctIdent);
                    debugInfo.mapping_attempt = identList.map((id, i) => ({id, idStr: String(id), matches: String(id).trim() === correctIdent, choice: choices[i]}));
                    debugInfo.idx = idx;
                    if (idx !== -1) correct_answer = choices[idx];
                  }
                  debugInfo.correct_answer = correct_answer;
                  console.log('QTI MAPPING', {correctIdent, identList, idx, correct_answer, mapping: debugInfo.mapping_attempt});
                  break;
                }
              }
            }
          } else if (type === 'short-answer' && item.resprocessing) {
            let respConditions = item.resprocessing.respcondition;
            if (respConditions) {
              if (!Array.isArray(respConditions)) respConditions = [respConditions];
              for (const cond of respConditions) {
                if (cond.conditionvar?.varequal) {
                  let varequal = cond.conditionvar.varequal;
                  correct_answer = typeof varequal === 'object' ? (varequal['#text'] || varequal._ || varequal['@_ident'] || varequal.ident || varequal) : varequal;
                  break;
                }
              }
            }
          }

          // Write debug info to console for one question
          console.log('QTI DEBUG', debugInfo);

          // 4. Handle image (if present)
          const imgMatch = /<img [^>]*src=["']([^"']+)["']/i.exec(prompt);
          if (imgMatch) {
            const rawSrc = imgMatch[1];
            const normalized = normalizeImageFilename(rawSrc);
            console.log('QTI IMAGE LOOKUP', {rawSrc, normalized, imageKeys: Object.keys(images)});
            console.log('DEBUG UPLOAD PATH', { examId, normalized, imagePath: `${examId}/${normalized.split('/').pop()}` });
            image_url = imageUrlMap[normalized] || '';
          }

          // 5. Assemble question (strip HTML from prompt, choices, correct_answer)
          const questionObj: any = {
            prompt: stripHtml(prompt),
            image_url,
            type
          };
          if (type === 'multiple-choice') {
            questionObj.choices = choices.map(stripHtml);
            questionObj.correct_answer = stripHtml(correct_answer);
          } else if (type === 'short-answer') {
            questionObj.correct_answer = stripHtml(correct_answer);
          }
          questions.push(questionObj);
        }
      }

      // Step 4: POST each question to backend
      let imported = 0;
      let errors: string[] = [];
      for (const q of questions) {
        try {
          const res = await fetch(`${API_BASE_URL}/question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...q, exam_id: examId })
          });
          if (!res.ok) {
            const errJson = await res.json();
            errors.push(errJson.error || 'Unknown error');
          } else {
            imported++;
          }
        } catch (err: any) {
          errors.push(err.message || 'Failed to POST question');
        }
      }
      setResult({ imported, errors });
      if (onSuccess) onSuccess({ imported, errors });
    } catch (err: any) {
      setError(err.message || 'Failed to import QTI');
    } finally {
      setUploading(false);
    }
  };

  const handleDialogClose = () => {
    setFile(null);
    setError('');
    setResult(null);
    setXmlFilesPreview([]);
    setMediaFilesPreview([]);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle>Import Questions from QTI</DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Typography>Select a QTI ZIP file (containing one or more XML and media files) to import questions for this exam.</Typography>
        </Box>
        <input
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          disabled={uploading}
        />
        {/* Preview extracted files (Step 4) */}
        {(xmlFilesPreview.length > 0 || mediaFilesPreview.length > 0) && (
          <Box mt={2}>
            <Typography variant="subtitle2">Files to be uploaded:</Typography>
            {xmlFilesPreview.length > 0 && (
              <Box mt={1}>
                <Typography variant="body2">XML Files:</Typography>
                <ul>
                  {xmlFilesPreview.map((f, idx) => (
                    <li key={idx}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                  ))}
                </ul>
              </Box>
            )}
            {mediaFilesPreview.length > 0 && (
              <Box mt={1}>
                <Typography variant="body2">Media Files:</Typography>
                <ul>
                  {mediaFilesPreview.map((f, idx) => (
                    <li key={idx}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                  ))}
                </ul>
              </Box>
            )}
          </Box>
        )}
        {uploading && <Box mt={2}><LinearProgress /></Box>}
        {error && <Box mt={2} color="error.main">{error}</Box>}
        {result && (
          <Box mt={2}>
            <Typography color="success.main">Imported {result.imported} questions.</Typography>
            {result.errors.length > 0 && (
              <Box color="error.main">
                <Typography variant="subtitle2">Errors:</Typography>
                <ul>
                  {result.errors.map((err, idx) => <li key={idx}>{err}</li>)}
                </ul>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} disabled={uploading}>Close</Button>
        <Button onClick={handleImport} variant="contained" disabled={uploading || !file}>Import</Button>
      </DialogActions>
    </Dialog>
  );
};

export default QtiImportDialog;