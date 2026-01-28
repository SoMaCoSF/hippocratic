# Hippocratic Updates - January 28, 2026

## Summary of Changes

This document summarizes all major updates made to the Hippocratic application.

---

## 1. ✨ Pillar of Light Effect for Selected Facilities

**Location:** `web/src/app/components/MapClient.tsx`

When you click on any facility card (from map, explorer, stacked, or network pages), the corresponding map marker now displays a dramatic "pillar of light" effect:

### Visual Features:
- **Vertical light beam** extending upward (200px, pulsing)
- **Glowing rings** pulsing outward in waves
- **Gentle bounce animation** on the marker
- **80% larger size** than normal markers
- **Bright glow** with shadow effects
- **Multiple animation layers** for 3D depth

### Animations:
- `pillarPulse` - Vertical beam pulsing between 180-220px
- `pulseGlow` - Outer glow ring expanding/contracting
- `pulseRing` - Middle ring subtle pulse
- `bounce` - Gentle 4px vertical movement

**Result:** Impossible to miss which facility is selected! 🔆

---

## 2. 🔐 Authentication System for Ingest Page

**Files:**
- `web/src/app/api/auth/login/route.ts` - Auth API
- `web/src/app/components/AuthGuard.tsx` - Auth guard component
- `web/src/app/ingest/page.tsx` - Protected with auth
- `web/AUTH.md` - Complete documentation

### Features:
- ✅ Email/password login
- ✅ Email verification with unique keys
- ✅ Time-limited tokens (15 min verification, 24h session)
- ✅ Authorized email list
- ✅ Session management with localStorage
- ✅ Logout functionality

### Flow:
1. User enters email/password
2. System validates against authorized list
3. Generates verification key (expires in 15 minutes)
4. Sends email with verification link
5. User clicks link or enters key
6. System creates 24-hour session token
7. User gains access to ingest page

### Configuration:
```bash
# .env.local or Vercel Environment Variables
AUTHORIZED_EMAILS=admin@hippocratic.app,user@example.com
NEXT_PUBLIC_APP_URL=https://hippocratic.vercel.app
```

### Security Notes:
⚠️ Current implementation is **development-ready**, not production-ready:
- In-memory token storage (use database in production)
- Simple SHA-256 hashing (use bcrypt in production)
- No rate limiting (add in production)
- Verification keys shown in console for testing

See `web/AUTH.md` for production recommendations.

---

## 3. 📊 Database Documentation

**File:** `DATABASE.md`

Complete documentation of the Turso SQLite database schema:

### Tables:
1. **facilities** - All CA healthcare facility data
2. **financials** - Revenue, expenses, visits
3. **observations** - User ratings and notes
4. **duplicate_groups** - Suspicious shared attributes
5. **facility_duplicates** - Junction table

### Features:
- Full schema with indexes
- Query examples
- Migration instructions
- Current status (static files vs database)
- Future enhancement roadmap

### Current Status:
⚠️ Web app is **NOT yet connected** to the database. Currently using:
- Static JSON: `/public/data/state/CA/all.min.json`
- Static CSV: `/public/data/enrichment/state/CA/hcai_hhah_util_2024.csv`

To connect: Create API routes and replace static file fetches with database queries.

---

## 4. 🎨 Enhanced ManimGL Visualization

**File:** `visualization/osint_network.py`

Upgraded network visualization with sophisticated color-coded connections:

### New Features:

#### Color-Coded Connection Types:
- **ADDRESS** (amber `#f59e0b`) - Shared physical location
- **PHONE** (purple `#a855f7`) - Shared phone number
- **OWNER** (cyan `#06b6d4`) - Same business owner
- **ADMIN** (pink `#ec4899`) - Same administrator

#### Interactive Node Selection:
New `InteractiveNetworkScene` where clicking a node:
- Highlights the selected node in green
- Shows **only its connections** with proper colors
- Uses curved arrows for visual clarity
- Animates each connection type separately
- Displays connection type legend

#### Enhanced Animations:
- Separate animation for each connection type
- Labeled transitions ("ADDRESS connections", etc.)
- Smoother edge creation with lag ratios
- Better node positioning and labeling

### Usage:
```bash
# Full analysis with color-coded edges
manimgl osint_network.py OSINTNetworkScene -o

# Interactive node selection
manimgl osint_network.py InteractiveNetworkScene -o

# Cluster deep dive
manimgl osint_network.py ClusterZoomScene -o

# Connection types explainer
manimgl osint_network.py ConnectionTypeScene -o
```

---

## 5. 📱 Mobile UX Improvements (Previous Updates)

### Top Navigation Bar:
- Thin pill buttons for navigation
- Consistent across all pages
- Mobile-first responsive design

### Clickable Facility Cards:
- Every facility card/row is clickable
- Navigates to map with facility selected
- Uses URL parameters (`?search=...&selected=...`)
- Works from explorer, stacked, network, and about pages

### Responsive Design:
- Optimized typography for mobile
- Stacked layouts on small screens
- Touch-friendly interactive elements
- Horizontal scrolling for tables

---

## Deployment

All changes are live on:
- **Production:** https://hippocratic.vercel.app
- **GitHub:** https://github.com/SoMaCoSF/hippocratic

### Latest Commits:
1. `feat: Add pillar of light effect for selected facility markers`
2. `feat: Complete authentication, database docs, and enhanced manim visualization`
3. `fix: Resolve variable name conflict in auth API route`

---

## Testing

### Test Pillar of Light:
1. Go to https://hippocratic.vercel.app
2. Click any facility card in the sidebar
3. Watch the map marker light up! ✨

### Test Authentication:
1. Go to https://hippocratic.vercel.app/ingest
2. Login with `admin@hippocratic.app` (any password in dev)
3. Check console for verification key
4. Key auto-fills and verifies
5. Access granted to ingest page

### Test ManimGL:
```bash
cd hippocratic/visualization
manimgl osint_network.py InteractiveNetworkScene -o
```

---

## Documentation Files

- `README.md` - Main project documentation
- `DATABASE.md` - Database schema and usage
- `web/AUTH.md` - Authentication system
- `UPDATES.md` - This file (summary of changes)
- `development_diary.md` - Development log

---

## Next Steps / Future Enhancements

### Database Integration:
- [ ] Create API routes for facilities, financials, observations
- [ ] Replace static file fetches with database queries
- [ ] Enable user observations to persist
- [ ] Set up Turso in Vercel environment

### Authentication:
- [ ] Integrate SendGrid/AWS SES for emails
- [ ] Use bcrypt for password hashing
- [ ] Add rate limiting
- [ ] Implement refresh tokens
- [ ] Add 2FA option

### Visualization:
- [ ] Export ManimGL videos for presentations
- [ ] Add more interactive scenes
- [ ] Integrate with web app (video player)
- [ ] Real-time network updates

### Features:
- [ ] Advanced search and filtering
- [ ] Export reports (PDF, CSV)
- [ ] Audit trail for data changes
- [ ] Role-based access control
- [ ] Webhook notifications

---

## Questions?

Contact the development team or check the documentation files listed above.
