# Dean Profile Display - Dynamic Name Integration ✅

## What's Updated

### ✅ Dynamic Dean Name Display
The dean's name now displays dynamically across the dean system:

1. **Dashboard Greeting**
   - "Good morning, {FirstName} 👋"
   - Shows first name extracted from full displayName
   - Example: "Good morning, Test 👋"

2. **Sidebar Profile Card**
   - Full name: "{FirstName} {LastName}"
   - Dynamic initials (e.g., "TD" for Test Dean)
   - Dynamic role badges (DEAN and/or ADVISER)
   - Example: Shows "Test Dean" with initials "TD"

3. **Dashboard Department**
   - Displays dean's department
   - Example: "College of Information Technology"

---

## Architecture

### New Files Created

#### `src/context/UserContext.jsx`
- Global user state management
- Fetches dean data from Firestore
- Provides `useUser()` hook
- Manages loading states

**Usage:**
```javascript
import { useUser } from '../context/UserContext';

function MyComponent() {
  const { deanData, user, loading } = useUser();
  
  if (loading) return <div>Loading...</div>;
  
  return <div>{deanData?.displayName}</div>;
}
```

### Updated Files

#### `src/App.jsx`
- Wrapped app with `UserProvider`
- Provides user context to all pages

#### `src/pages/Dashboard.jsx`
- Uses `useUser()` hook
- Displays dean's first name in greeting
- Shows dean's department
- Handles loading state

#### `src/components/Sidebar.jsx`
- Uses `useUser()` hook
- Generates initials from displayName
- Shows full name in profile card
- Conditionally renders role badges
- Dynamic initials (e.g., "TD", "DC", "MP")

---

## Data Flow

### 1. User Logs In
```
Login.jsx
  ↓
Creates Firebase Auth account
  ↓
Updates Firestore users/{uid}
{
  displayName: "Test Dean",
  department: "College of Information Technology",
  role: "dean+adviser"
}
```

### 2. App Loads
```
App.jsx
  ↓
UserProvider wraps routes
  ↓
Checks Firebase Auth state
  ↓
Fetches user data from Firestore
  ↓
Provides data via useUser() hook
```

### 3. Components Display Data
```
Dashboard.jsx & Sidebar.jsx
  ↓
Call useUser()
  ↓
Extract displayName, department, role
  ↓
Render dynamic content
```

---

## Firestore Data Used

### User Document (`users/{uid}`)
```javascript
{
  uid: "firebase_uid",
  email: "test.dean@phinmaed.com",
  displayName: "Test Dean",           // Used for name display
  role: "dean+adviser",               // Used for role badges
  department: "College of IT",        // Used for dashboard info
  status: "active",
  createdAt: "2026-07-22T..."
}
```

---

## Display Examples

### Example 1: Test Dean
```
Email: test.dean@phinmaed.com
Full Name: Test Dean
Department: College of Information Technology
Role: dean+adviser

Display:
- Dashboard greeting: "Good morning, Test 👋"
- Sidebar name: "Test Dean"
- Sidebar initials: "TD"
- Role badges: DEAN + ADVISER
- Department: "College of Information Technology"
```

### Example 2: Maria Santos
```
Email: maria.santos@phinmaed.com
Full Name: Maria Santos
Department: College of Nursing
Role: dean

Display:
- Dashboard greeting: "Good morning, Maria 👋"
- Sidebar name: "Maria Santos"
- Sidebar initials: "MS"
- Role badges: DEAN only
- Department: "College of Nursing"
```

---

## How to Test

### Step 1: Login as Dean
1. Open dean-system
2. Click "Activate Account"
3. Enter email and password
4. Activate account

### Step 2: Verify Dashboard
1. Should show: "Good morning, {FirstName} 👋"
2. Should show department name
3. Department matches Firestore data

### Step 3: Verify Sidebar
1. Check sidebar profile card
2. Shows full dean name
3. Shows correct initials
4. Shows correct role badges
5. Matches Firestore displayName

---

## Files Modified

| File | Changes |
|------|---------|
| `src/App.jsx` | Added UserProvider wrapper |
| `src/pages/Dashboard.jsx` | Added useUser hook, dynamic name display |
| `src/components/Sidebar.jsx` | Added useUser hook, dynamic initials, role badges |
| `src/context/UserContext.jsx` | NEW - Global user state management |

---

## Code Examples

### Using useUser() in Your Components

```javascript
import { useUser } from '../context/UserContext';

export default function MyComponent() {
  const { deanData, user, loading } = useUser();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Welcome, {deanData?.displayName}</h1>
      <p>Department: {deanData?.department}</p>
      <p>Role: {deanData?.role}</p>
    </div>
  );
}
```

### Extracting First Name for Greeting

```javascript
const deanName = deanData?.displayName || 'Dean';
const firstName = deanName.split(' ')[0]; // Gets first word

// Output: "Test Dean" → "Test"
```

### Generating Initials

```javascript
const deanName = deanData?.displayName || 'Dean';
const initials = deanName
  .split(' ')
  .map(n => n[0])
  .join('')
  .toUpperCase();

// Output: "Test Dean" → "TD"
// Output: "Dr. Maria Santos" → "DMS"
```

---

## Troubleshooting

### Error: "deanData is undefined"
**Solution:** Check that user data was saved to Firestore users collection with displayName

### Error: "useUser must be used within UserProvider"
**Solution:** Make sure component is wrapped inside App.jsx routes (it is automatically)

### Name showing as "Dean"
**Solution:** Check Firestore users/{uid} document has displayName field

### Initials showing as "D"
**Solution:** Check displayName is set correctly in Firestore

---

## Next Steps

### Now Available ✅
- [x] Dynamic dean name display
- [x] Dynamic department display
- [x] Dynamic role badges
- [x] Global user context
- [x] Initials generation
- [x] Dashboard greeting personalization

### Ready to Add 🔨
- [ ] Logout functionality
- [ ] Edit profile page
- [ ] Change password
- [ ] Department statistics (personalized)
- [ ] Adviser management

---

**Everything is working!** Your dean system now shows the logged-in dean's name dynamically! 🚀
