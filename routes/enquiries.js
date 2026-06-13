// routes/enquiries.js
const express = require('express');
const router = express.Router();
const Enquiry = require('../models/Enquiry');
const { protect } = require('../middleware/auth');
const { sendEnquiryEmail, sendConfirmationEmail } = require('../config/email');

// ── POST /api/enquiries ──
// Public — website contact form submits here
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, interest, budget, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    // Save to MongoDB
    const enquiry = await Enquiry.create({
      name, email, phone, interest, budget, message,
      ip: req.ip,
      source: 'website',
    });

    // ── RESPOND IMMEDIATELY ──
    res.set('Connection', 'keep-alive');
    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully! We will contact you within 24 hours.',
    });

    // ── Send emails in BACKGROUND (after response sent) ──
    // This way the website never hangs waiting for email
    setImmediate(async () => {
      try {
        await sendEnquiryEmail(enquiry);
        await sendConfirmationEmail(enquiry);
        console.log('✅ Enquiry emails sent for:', enquiry.name);
      } catch (emailErr) {
        console.log('⚠️ Email failed (enquiry still saved):', emailErr.message);
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── GET /api/enquiries ──
// Protected — admin only
router.get('/', protect, async (req, res) => {
  try {
    const { read, limit } = req.query;
    let query = {};
    if (read === 'false') query.read = false;
    if (read === 'true')  query.read = true;

    const enquiries = await Enquiry.find(query)
      .sort({ createdAt: -1 })
      .limit(limit ? parseInt(limit) : 0);

    const unreadCount = await Enquiry.countDocuments({ read: false });

    res.json({
      success: true,
      count: enquiries.length,
      unreadCount,
      data: enquiries,
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── PUT /api/enquiries/:id/read ──
// Protected — mark as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!enquiry) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: enquiry });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── PUT /api/enquiries/:id/notes ──
// Protected — add internal notes
router.put('/:id/notes', protect, async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { notes: req.body.notes, replied: req.body.replied },
      { new: true }
    );
    res.json({ success: true, data: enquiry });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── PUT /api/enquiries/read-all ──
// Protected — mark all as read
router.put('/read-all', protect, async (req, res) => {
  try {
    await Enquiry.updateMany({ read: false }, { read: true });
    res.json({ success: true, message: 'All marked as read' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── DELETE /api/enquiries/:id ──
// Protected
router.delete('/:id', protect, async (req, res) => {
  try {
    await Enquiry.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Enquiry deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
