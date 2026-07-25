# Dean Onboarding - Firebase Integration

## What's Updated

### ✅ Email Validation
- Dean emails MUST use `@phinmaed.com` domain
- Example: `prdo.vender.swu@phinmaed.com`
- System will reject any other domain

### ✅ Firestore Integration
- Creates dean invitation in `deans` collection
- Stores: firstName, lastName, email, department, programs, role, status
- Status: `pending` (waiting for dean to activate) → `active` (after setup)

### ✅ Real-time Data
- Dean list fetches from Firestore on page load
- Automatically refreshes after creating new dean
- Search works across name, email, and department

### ✅ Role Assignment
1. **Dean Only** - Access Dean Dashboard only
2. **Dean + Research Adviser** - Dual role with access to both dashboards

## How It Works

### 1. Admin Creates Dean Account
```
System Administrator → Dean Onboarding → Create Dean Account
```

**Required Fields:**
- First Name
- Last Name  
- Email (must be @phinmaed.com)
- Department
- Programs (optional, comma-separated)
- Role Selection

### 2. Dean Record Stored in Firestore
```javascript
{
  firstName: "Maria",
  lastName: "Santos",
  displayName: "Maria Santos",
  email: "maria.santos@phinmaed.com",
  department: "College of Information Technology",
  programs: ["BSIT", "BSCS", "BSIS"],
  role: "dean+adviser",
  status: "pending",
  invitationSent: true,
  invitationDate: "2026-07-22T14:30:00.000Z",
  createdAt: "2026-07-22T14:30:00.000Z",
  createdBy: "admin"
}
```

### 3. Dean Status
- **Pending** - Dean account created, invitation sent, waiting for activation
  - Shows "Resend" button to send invitation email again
- **Active** - Dean has set their password and activated their account
  - Shows View/Edit/Deactivate action buttons

## Next Steps

### Immediate
- [x] Email validation for @phinmaed.com
- [x] Create dean record in Firestore
- [x] Real-time data display
- [x] Role selection (dean only vs dean+adviser)

### Coming Soon
- [ ] Email invitation system (send actual invitation emails)
- [ ] Dean activation link (allows dean to set their password)
- [ ] Dean login page with activation flow
- [ ] View/Edit/Deactivate dean accounts

## Testing

### Create a Test Dean Account
1. Login as System Administrator (japhetvender00@gmail.com)
2. Navigate to Dean Onboarding
3. Click "Create Dean Account"
4. Fill in:
   - First Name: `Test`
   - Last Name: `Dean`
   - Email: `test.dean@phinmaed.com`
   - Department: `College of Information Technology`
   - Programs: `BSIT, BSCS` (optional)
   - Role: `Dean + Research Adviser`
5. Click "Send Invite & Create Account"
6. Check Firestore Console → `deans` collection

### Verify in Firestore
```
Firebase Console → Firestore Database → deans collection
```

You should see the new dean record with status: "pending"

## Email Domain Validation

### ✅ Valid Emails
- prdo.vender.swu@phinmaed.com
- test.dean@phinmaed.com
- maria.santos@phinmaed.com

### ❌ Invalid Emails
- dean@swu.phinma.edu.ph (wrong domain)
- test@gmail.com (wrong domain)
- dean@phinma.com (wrong domain)

## Database Structure

### Firestore Collections
```
/deans
  /{deanId}
    - firstName: string
    - lastName: string
    - displayName: string
    - email: string (unique)
    - department: string
    - programs: array of strings
    - role: 'dean' | 'dean+adviser'
    - status: 'pending' | 'active'
    - invitationSent: boolean
    - invitationDate: ISO timestamp
    - createdAt: ISO timestamp
    - createdBy: string (admin UID)
```

## Status Flow

```
1. ADMIN creates dean → status: "pending"
2. ADMIN sends invitation email → invitationSent: true
3. DEAN clicks activation link → redirects to setup page
4. DEAN sets password → creates Firebase Auth account
5. DEAN completes profile → status: "active"
6. DEAN can now login → access Dean Dashboard
```
