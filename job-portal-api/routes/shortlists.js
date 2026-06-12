const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// POST /api/shortlists - Shortlist a candidate (company only)
router.post('/', authenticateToken, requireRole('company'), async (req, res) => {
  const companyId = req.user.companyId;
  const { candidate_id } = req.body;

  if (!companyId) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Company profile required.' });
  }

  if (!candidate_id) {
    return res.status(400).json({ success: false, message: 'Candidate ID is required' });
  }

  try {
    // 1. Verify candidate exists
    const [candidates] = await pool.query('SELECT Id FROM Candidate WHERE Id = ? AND IsActive = TRUE', [candidate_id]);
    if (candidates.length === 0) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // 2. Check if already shortlisted by this company
    const [existing] = await pool.query(
      'SELECT Id FROM Shortlists WHERE CandidateId = ? AND CompanyId = ?',
      [candidate_id, companyId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Candidate is already shortlisted' });
    }

    const shortlistId = crypto.randomUUID();

    // 3. Create shortlist record
    await pool.query(
      'INSERT INTO Shortlists (Id, UserId, CandidateId, CompanyId) VALUES (?, ?, ?, ?)',
      [shortlistId, req.user.id, candidate_id, companyId]
    );

    return res.status(201).json({
      success: true,
      message: 'Candidate shortlisted successfully',
      data: {
        id: shortlistId,
        candidateId: candidate_id,
        companyId
      }
    });
  } catch (error) {
    console.error('Shortlist Candidate Error:', error);
    return res.status(500).json({ success: false, message: 'Server error shortlisting candidate' });
  }
});

// GET /api/shortlists - Get shortlisted candidates (company only)
router.get('/', authenticateToken, requireRole('company'), async (req, res) => {
  const companyId = req.user.companyId;

  if (!companyId) {
    return res.status(403).json({ success: false, message: 'Unauthorized. Company profile required.' });
  }

  try {
    const [shortlists] = await pool.query(
      `SELECT s.Id as shortlist_id, s.CreatedAt as shortlisted_at, cand.Id as candidate_id, cand.DOB,
              u.FirstName, u.LastName, u.Email, u.MobileNo, u.Bio
       FROM Shortlists s
       JOIN Candidate cand ON s.CandidateId = cand.Id
       JOIN Users u ON cand.UserId = u.Id
       WHERE s.CompanyId = ?
       ORDER BY s.CreatedAt DESC`,
      [companyId]
    );

    const data = shortlists.map(row => ({
      shortlistId: row.shortlist_id,
      shortlistedAt: row.shortlisted_at,
      candidate: {
        id: row.candidate_id,
        firstName: row.FirstName,
        lastName: row.LastName,
        email: row.Email,
        mobileNo: row.MobileNo,
        bio: row.Bio,
        dob: row.DOB
      }
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error('Get Shortlists Error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving shortlists' });
  }
});

module.exports = router;
