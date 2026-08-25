// Section: Navigation Items Data
// arrNavItems is an array of objects representing sidebar navigation options.
export const arrNavItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', active: false },
  { id: 'purchase', label: 'Purchase', icon: '🛒', active: false },
  { id: 'requisition', label: 'Requisition', icon: '📝', active: false },
  { id: 'approval', label: 'Approval', icon: '✅', active: false, badge: '3' },
  { id: 'dispatch', label: 'Dispatch', icon: '🚚', active: false },
  { id: 'receipt', label: 'Branch Receipt', icon: '🏢', active: false },
  { id: 'balance', label: 'Stock Balance', icon: '🗄️', active: false },
  { id: 'users', label: 'Users', icon: '👥', active: true }
];

// Section: Avatar Color Options
// arrAvatarColors is an array of hex code strings for user profile avatar backgrounds.
export const arrAvatarColors = [
  '#ede9fe', // Lavender
  '#fef3c7', // Amber
  '#dbeafe', // Blue
  '#d1fae5', // Green
  '#fce7f3', // Pink
  '#fee2e2'  // Red
];

// Section: System Departments list
// arrDepartments is an array of strings representing departments users can belong to.
export const arrDepartments = [
  'Logistics & Warehousing',
  'Operations',
  'Procurement',
  'Finance & Auditing',
  'Human Resources',
  'Administration & IT'
];

// Section: Preset User Roles
// arrRoles is an array of objects describing the core security roles in the application.
export const arrRoles = [
  { value: 'admin', label: 'Administrator', desc: 'Full system management and configuration rights.' },
  { value: 'manager', label: 'Stock Manager', desc: 'Manage catalog, restocks, suppliers, and view transactions.' },
  { value: 'user', label: 'Regular User', desc: 'View inventory balance and raise requisitions only.' }
];

// Section: Supported Timezones
// arrTimezones is an array of timezone strings.
export const arrTimezones = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'Europe/London',
  'Asia/Dubai',
  'Asia/Tokyo'
];

// Section: Supported Languages
// arrLanguages is an array of language display strings.
export const arrLanguages = [
  'English (US)',
  'English (UK)',
  'Hindi',
  'Spanish',
  'French',
  'German'
];
