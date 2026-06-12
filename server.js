// ============================================================
// server.js — IMAKSA Backend API
// Main entry point
// ============================================================

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const connectDB  = require('./config/db');
const { verifyEmail } = require('./config/email');

// ── Route imports ──
const authRoutes      = require('./routes/auth');
const propertyRoutes  = require('./routes/properties');
const blogRoutes      = require('./routes/blogs');
const teamRoutes      = require('./routes/team');
const enquiryRoutes   = require('./routes/enquiries');

// ── Connect to MongoDB ──
connectDB();

const app = express();

// ── TRUST RAILWAY PROXY (fixes rate-limiter X-Forwarded-For crash) ──
app.set('trust proxy', 1);

// ============================================================
// MIDDLEWARE
// ============================================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — allow all origins (handles file://, localhost, and live domains)
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (file://, mobile apps, Postman)
    // AND all listed domains
    const allowed = [
      'https://imaksa.ae',
      'https://www.imaksa.ae',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5500',
      'http://127.0.0.1:5500',
      'http://127.0.0.1:3000',
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      // Allow anyway during development — remove this in production
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging (only in dev mode)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── Rate Limiting ──
// Prevent spam attacks on contact form
const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 form submissions per 15 minutes per IP
  message: { 
    success: false, 
    message: 'Too many submissions. Please wait 15 minutes.' 
  },
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests.' },
});

// Login limiter — prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' },
});

app.use('/api/', apiLimiter);

// ============================================================
// ROUTES
// ============================================================

app.use('/api/auth',        loginLimiter, authRoutes);
app.use('/api/properties',  propertyRoutes);
app.use('/api/blogs',       blogRoutes);
app.use('/api/team',        teamRoutes);
app.use('/api/enquiries',   formLimiter, enquiryRoutes);

// ── Root route — health check ──
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏡 IMAKSA API is running',
    version: '1.0.0',
    endpoints: {
      auth:        '/api/auth',
      properties:  '/api/properties',
      blogs:       '/api/blogs',
      team:        '/api/team',
      enquiries:   '/api/enquiries',
    },
  });
});

// ── Health check endpoint ──
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong on the server',
  });
});

// ============================================================
// SEED DEFAULT DATA (runs once on first start)
// ============================================================
const seedDefaultData = async () => {
  try {
    const Admin = require('./models/Admin');
    const Property = require('./models/Property');
    const Blog = require('./models/Blog');
    const Team = require('./models/Team');

    // Create default admin if none exists
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'imaksa2025',
        name: 'IMAKSA Admin',
        email: process.env.CLIENT_EMAIL || '',
      });
      console.log('✅ Default admin created');
    }

    // Seed properties if empty
    const propCount = await Property.countDocuments();
    if (propCount === 0) {
      await Property.insertMany([
        { name: 'Sunset Palm Villa', price: '28,500,000', type: 'villa', status: 'active', location: 'Palm Jumeirah, Dubai', beds: '6', baths: '8', area: '12,400', badge: 'Signature', desc: 'A breathtaking beachfront villa on Palm Jumeirah with panoramic sea views and private pool.', img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=700&q=80', featured: true, order: 1 },
        { name: 'Sky Penthouse 91', price: '15,200,000', type: 'penthouse', status: 'active', location: 'Downtown Dubai', beds: '4', baths: '5', area: '6,800', badge: 'New Launch', desc: 'Ultra-luxury penthouse on the 91st floor with Burj Khalifa views.', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80', featured: true, order: 2 },
        { name: 'Golf Grove Residence', price: '9,750,000', type: 'villa', status: 'active', location: 'Dubai Hills Estate', beds: '5', baths: '6', area: '7,200', badge: 'Ready to Move', desc: 'Contemporary villa overlooking Dubai Hills Golf Course with smart home features.', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80', order: 3 },
        { name: 'Marina Azure Tower', price: '3,400,000', type: 'apartment', status: 'active', location: 'Dubai Marina', beds: '3', baths: '4', area: '2,100', badge: '', desc: 'Modern apartment with full marina views and direct beach access.', img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=700&q=80', order: 4 },
        { name: 'Skyline Residences', price: '2,100,000', type: 'offplan', status: 'active', location: 'Business Bay, Dubai', beds: '2', baths: '3', area: '1,450', badge: 'Off-Plan', desc: 'Premium off-plan apartments with flexible payment plans.', img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=700&q=80', order: 5 },
        { name: 'DIFC Crown Penthouse', price: '22,000,000', type: 'penthouse', status: 'active', location: 'DIFC, Dubai', beds: '5', baths: '6', area: '9,200', badge: 'Exclusive', desc: 'The crown jewel of DIFC with private rooftop terrace and concierge service.', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=700&q=80', order: 6 },
        { name: 'Emirates Hills Estate', price: '18,500,000', type: 'villa', status: 'active', location: 'Emirates Hills, Dubai', beds: '7', baths: '9', area: '15,000', badge: 'Ready', desc: 'Palatial estate with cinema room, gym, and staff quarters.', img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=700&q=80', order: 7 },
        { name: 'DIFC Office Suite', price: '8,200,000', type: 'commercial', status: 'active', location: 'DIFC, Dubai', beds: '', baths: '4', area: '4,500', badge: 'Commercial', desc: 'Premium fitted office in DIFC Gate Village.', img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=700&q=80', order: 8 },
      ]);
      console.log('✅ Default properties seeded');
    }

    // Seed blogs if empty
    const blogCount = await Blog.countDocuments();
    if (blogCount === 0) {
      await Blog.insertMany([
        { title: 'Dubai Real Estate Market 2025: What Investors Need to Know', desc: 'Dubai\'s property market continues to break records in 2025. Transaction volumes up 34% year-on-year with rental yields hitting 8%+.', cat: 'Market Update', status: 'Published', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80', readTime: '8 min read' },
        { title: 'How to Buy Property in Dubai as a Foreigner in 2025', desc: 'A complete step-by-step guide for international buyers — from choosing a location to getting your title deed.', cat: 'Buying Guide', status: 'Published', img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80', readTime: '6 min read' },
        { title: 'UAE Golden Visa: The Complete 2025 Guide', desc: 'Everything about getting UAE residency through real estate investment — eligibility, costs, and timeline.', cat: 'Golden Visa', status: 'Published', img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80', readTime: '5 min read' },
        { title: 'Off-Plan vs Ready Property: Which is Better?', desc: 'We break down the pros and cons of both options so you can make the smartest investment decision.', cat: 'Investment', status: 'Published', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80', readTime: '7 min read' },
        { title: 'Top 5 Dubai Areas for Highest Rental Yields in 2025', desc: 'From Business Bay to JVC — we rank Dubai\'s best areas for rental returns based on real data.', cat: 'Investment', status: 'Published', img: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80', readTime: '5 min read' },
        { title: 'NRI Guide to Investing in Dubai from India', desc: 'Tax benefits, repatriation rules, and the best areas for Indian investors looking to buy in Dubai.', cat: 'NRI Guide', status: 'Draft', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80', readTime: '6 min read' },
      ]);
      console.log('✅ Default blogs seeded');
    }

    // Seed team if empty
    const teamCount = await Team.countDocuments();
    if (teamCount === 0) {
      await Team.insertMany([
        { name: 'Mohammed Al Maktoum', role: 'CEO & Founder', email: 'ceo@imaksa.ae', phone: '+971 50 123 4567', bio: '12 years of Dubai real estate expertise. Former RERA advisor.', photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80', order: 1 },
        { name: 'Sarah Al Hashimi', role: 'Sales Director', email: 'sarah@imaksa.ae', phone: '+971 50 234 5678', bio: 'Luxury property specialist with over AED 500M in closed deals.', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=80', order: 2 },
        { name: 'Raj Patel', role: 'Investment Advisor', email: 'raj@imaksa.ae', phone: '+971 50 345 6789', bio: 'NRI & expat specialist. Fluent in English, Hindi, Gujarati.', photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80', order: 3 },
        { name: 'Fatima Al Zaabi', role: 'Property Manager', email: 'fatima@imaksa.ae', phone: '+971 50 456 7890', bio: 'Expert in rental management and tenant relations.', photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80', order: 4 },
      ]);
      console.log('✅ Default team seeded');
    }

  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log('\n============================================');
  console.log('🏡 IMAKSA Backend Server Started');
  console.log(`🚀 Running on: http://localhost:${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  console.log('============================================\n');

  // Seed data after server starts
  await seedDefaultData();

  // Verify email
  await verifyEmail();
});

module.exports = app;
