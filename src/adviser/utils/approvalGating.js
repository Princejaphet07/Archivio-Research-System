/**
 * ARCHIVIO Linear Approval Gating Engine
 * Enforces academic integrity by ensuring all requirements and checks are satisfied
 * before allowing an adviser to endorse a research manuscript for Dean publication.
 */

export const validateSubmissionReadiness = (submission, requirements = []) => {
  if (!submission) {
    return {
      isReady: false,
      reasons: ['Submission record not found.'],
      approvedCount: 0,
      totalRequired: 0,
      missingDocs: [],
      unapprovedDocs: [],
      hasRevisionsPending: false,
      similarityWarning: null
    };
  }

  const uploadedDocs = submission.uploadedDocs || [];
  const approvals = submission.documentApprovals || {};
  const revisions = submission.documentRevisions || {};
  const reasons = [];

  // 1. Check required documents vs uploaded documents
  const missingDocs = [];
  requirements.forEach(req => {
    const isUploaded = uploadedDocs.some(docTitle => 
      docTitle === req.id || 
      docTitle === req.title ||
      (req.title && docTitle?.toLowerCase() === req.title?.toLowerCase())
    );
    if (!isUploaded) {
      missingDocs.push(req.title || req.id);
    }
  });

  if (missingDocs.length > 0) {
    reasons.push(`Incomplete Submission: ${missingDocs.length} required file(s) have not been uploaded by students.`);
  }

  // 2. Check each uploaded document for adviser review/approval
  const unapprovedDocs = [];
  uploadedDocs.forEach(docTitle => {
    const isApproved = Boolean(approvals[docTitle]);
    if (!isApproved) {
      unapprovedDocs.push(docTitle);
    }
  });

  if (unapprovedDocs.length > 0) {
    reasons.push(`Unverified Documents: ${unapprovedDocs.length} file(s) must be checked and approved individually in the Document Viewer.`);
  }

  // 3. Check for pending revision requests
  const pendingRevisionKeys = Object.keys(revisions).filter(key => Boolean(revisions[key]));
  const hasRevisionsPending = pendingRevisionKeys.length > 0;
  if (hasRevisionsPending) {
    reasons.push(`Pending Revisions: There are active revision requests on ${pendingRevisionKeys.join(', ')}.`);
  }

  // 4. Similarity plagiarism check warning
  let similarityWarning = null;
  const similarityScore = submission.similarityScore ?? submission.similarity?.score;
  if (typeof similarityScore === 'number' && similarityScore >= 75) {
    similarityWarning = `High Risk Similarity (${similarityScore}%). Research paper requires advisory verification before publication endorsement.`;
    reasons.push(similarityWarning);
  }

  const approvedCount = Object.keys(approvals).filter(k => approvals[k] === true).length;
  const totalRequired = Math.max(requirements.length, uploadedDocs.length);
  const isReady = reasons.length === 0 && approvedCount >= totalRequired && totalRequired > 0;

  return {
    isReady,
    reasons,
    approvedCount,
    totalRequired,
    missingDocs,
    unapprovedDocs,
    hasRevisionsPending,
    similarityWarning
  };
};
