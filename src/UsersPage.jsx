import { useState, useMemo, useEffect, useCallback } from 'react';
import { arrAvatarColors, arrRoles } from './data.js';
import { objApi } from './api.js';

const funcGetInitials = (strName) => {
  if (!strName || typeof strName !== 'string') return "?";
  const arrParts = strName.trim().split(/\s+/).filter(Boolean);
  if (arrParts.length === 0) return "?";
  if (arrParts.length === 1) return arrParts[0].substring(0, 2).toUpperCase();
  return (arrParts[0][0] + arrParts[1][0]).toUpperCase();
};

// Section: Password Strength Evaluation
// funcGetStrength returns a score and label representing how strong a password is.
function funcGetStrength(strPwd) {
  if (!strPwd) return { intLevel: 0, strLabel: '', strCls: '' };
  let intScore = 0;
  if (strPwd.length >= 8)            intScore++;
  if (strPwd.length >= 12)           intScore++;
  if (/[A-Z]/.test(strPwd))          intScore++;
  if (/[0-9]/.test(strPwd))          intScore++;
  if (/[^A-Za-z0-9]/.test(strPwd))  intScore++;
  if (intScore <= 1) return { intLevel: 1, strLabel: 'Weak',   strCls: 'weak' };
  if (intScore === 2) return { intLevel: 2, strLabel: 'Fair',   strCls: 'fair' };
  if (intScore === 3) return { intLevel: 3, strLabel: 'Good',   strCls: 'good' };
  return           { intLevel: 4, strLabel: 'Strong', strCls: 'strong' };
}

// PasswordStrength component shows a visual meter of password strength.
function PasswordStrength({ strPwd }) {
  const { intLevel, strLabel, strCls } = funcGetStrength(strPwd);
  const arrBars = [1, 2, 3, 4];
  const funcBarClass = (intI) => (intI > intLevel ? 'pwd-bar' : `pwd-bar filled-${strCls}`);
  return (
    <div className="pwd-strength">
      <div className="pwd-bars">
        {arrBars.map(intI => <div key={intI} className={funcBarClass(intI)} />)}
      </div>
      {strLabel && <span className={`pwd-text ${strCls}`}>{strLabel} password</span>}
    </div>
  );
}

// arrSteps holds step numbers and labels for the multi-step registration form.
const arrSteps = [
  { intId: 1, strLabel: 'Personal Info' },
  { intId: 2, strLabel: 'Account' },
  { intId: 3, strLabel: 'Role & Access' },
  { intId: 4, strLabel: 'Review' },
];

// objDefaultForm specifies initial blank fields for creating a new user profile.
const objDefaultForm = {
  strFirstName:   '',
  strLastName:    '',
  strEmail:       '',
  strPhone:       '',
  strDateOfBirth: '',
  strGender:      '',
  strNationality: '',
  strAddress:     '',
  strCity:        '',
  strCountry:     '',
  strPostalCode:  '',
  strBio:         '',
  strUsername:    '',
  strPassword:    '',
  strConfirmPwd:  '',
  intAvatarColor: 0,
  strEmployeeId:  '',
  strStartDate:   '',
  strRole:        'user',
  strBranch:      '',
  strDepartment:  '',
  strJobTitle:    '',
  strReportingTo: '',
  objPermissions: {
    boolViewInventory:   true,
    boolEditInventory:   false,
    boolViewOrders:      true,
    boolManageOrders:    false,
    boolViewReports:     true,
    boolExportData:      false,
    boolManageUsers:     false,
    boolManageSettings:  false,
    boolViewFinancials:  false,
    boolManageSuppliers: false,
  },
  boolTwoFactor: false,
  boolSsoLogin:  false,
  boolApiAccess: false,
  strTimezone:     'UTC',
  strLanguage:     'English (US)',
  strDateFormat:   'MM/DD/YYYY',
  strCurrency:     'USD',
  strTheme:        'dark',
  boolEmailNotifs:  true,
  boolSmsNotifs:    false,
  boolPushNotifs:   true,
  boolWeeklyDigest: true,
  boolSystemAlerts: true,
  boolNewsletter:   false,
  strNotes:        '',
};

// funcValidateAll checks user form fields for validation errors.
function funcValidateAll(objForm) {
  const objErrors = {};

  if (!objForm.strFirstName.trim())  objErrors.strFirstName = 'First name is required';
  if (!objForm.strLastName.trim())   objErrors.strLastName  = 'Last name is required';
  if (!objForm.strEmail.trim())      objErrors.strEmail     = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(objForm.strEmail))
                                     objErrors.strEmail     = 'Enter a valid email';
  
  if (!objForm.strDateOfBirth)       objErrors.strDateOfBirth = 'Date of birth is required';
  if (!objForm.strGender)            objErrors.strGender    = 'Gender is required';

  if (!objForm.strUsername.trim())        objErrors.strUsername   = 'Username is required';
  else if (objForm.strUsername.length < 3) objErrors.strUsername  = 'Min 3 characters';
  if (!objForm.strPassword)               objErrors.strPassword   = 'Password is required';
  else if (objForm.strPassword.length < 8) objErrors.strPassword  = 'Min 8 characters';
  if (objForm.strPassword !== objForm.strConfirmPwd) objErrors.strConfirmPwd = 'Passwords do not match';
  if (!['stock manager', 'manager'].includes((objForm.strRole || '').toLowerCase()) && !objForm.strBranch)                 objErrors.strBranch     = 'Branch is required';

  const arrStep1Fields = ['strFirstName', 'strLastName', 'strEmail', 'strDateOfBirth', 'strGender'];
  const arrStep2Fields = ['strUsername', 'strPassword', 'strConfirmPwd'];
  const arrStep3Fields = ['strBranch'];
  let intFirstBadStep = null;
  if (arrStep1Fields.some(strF => objErrors[strF]))      intFirstBadStep = 1;
  else if (arrStep2Fields.some(strF => objErrors[strF])) intFirstBadStep = 2;
  else if (arrStep3Fields.some(strF => objErrors[strF])) intFirstBadStep = 3;

  return { objErrors, intFirstBadStep };
}

// AddUserModal component renders a pop-up wizard to register a new user.
export function AddUserModal({ funcOnClose, funcOnSave, arrRolesList = [], objRoleDescriptions = {}, arrBranches = [] }) {
  const arrDisplayRoles = useMemo(() => {
    if (arrRolesList && arrRolesList.length > 0) {
      // Filter out the branch-specific stock manager role from the UI options
      // so it isn't shown as a separate selectable radio button.
      return arrRolesList.filter(r => r !== 'Stock Manager (Branch)' && r !== 'Stock Manager(Branch)').map(strRname => {
        let strValue = strRname.toLowerCase().replace(/\s+/g, '');
        // Keep the legacy values for the default roles to avoid breaking existing state logic
        if (strValue === 'stockmanager') strValue = 'manager';
        if (strValue === 'branchuser') strValue = 'user';
        
        return {
          value: strValue === 'admin' || strValue === 'manager' || strValue === 'user' ? strValue : strRname,
          label: strRname,
          desc: objRoleDescriptions[strRname] || "Custom defined database role privileges"
        };
      });
    }
    return arrRoles;
  }, [arrRolesList, objRoleDescriptions]);

  const [intStep, funcSetStep]           = useState(1);
  const [objForm, funcSetForm]           = useState(() => ({
    ...objDefaultForm,
    strRole: arrDisplayRoles[0]?.value || 'user'
  }));
  const [objErrors, funcSetErrors]       = useState({});
  const [boolShowPwd, funcSetShowPwd]     = useState(false);
  const [boolShowConfirm, funcSetShowConfirm] = useState(false);

  const funcSetField = useCallback((strField, objValue) => {
    funcSetForm(prev => ({ ...prev, [strField]: objValue }));
    funcSetErrors(prev => { const objE = { ...prev }; delete objE[strField]; return objE; });
  }, []);

  const funcSetPermission = useCallback((strKey, boolVal) => {
    funcSetForm(prev => ({ ...prev, objPermissions: { ...prev.objPermissions, [strKey]: boolVal } }));
  }, []);

  const funcHandleNext = () => { funcSetErrors({}); funcSetStep(s => s + 1); };
  const funcHandleBack = () => funcSetStep(s => s - 1);

  const funcHandleSubmit = () => {
    const { objErrors: objErrs, intFirstBadStep } = funcValidateAll(objForm);
    if (Object.keys(objErrs).length) {
      funcSetErrors(objErrs);
      if (intFirstBadStep) funcSetStep(intFirstBadStep);
      return;
    }
    const strInitials = (objForm.strFirstName[0] || '') + (objForm.strLastName[0] || '');
    funcOnSave({
      ...objForm,
      id:        Date.now(),
      strStatus:    'Pending',
      strCreatedAt: new Date().toISOString().split('T')[0],
      strLastLogin: 'Never',
      strInitials:  strInitials.toUpperCase(),
    });
  };

  const strInitials    = ((objForm.strFirstName[0] || '') + (objForm.strLastName[0] || '')).toUpperCase() || '?';

  return (
    <div className="modal-overlay" id="add-user-modal-overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Add New User">

        {/* ---- Header ---- */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h2>➕ Add New User</h2>
            <p>Step {intStep} of {arrSteps.length} – {arrSteps[intStep - 1].strLabel}</p>
          </div>
          <button id="modal-close-btn" className="modal-close" onClick={funcOnClose} aria-label="Close">✕</button>
        </div>

        {/* ---- Progress Steps Bar ---- */}
        <div className="steps-bar" role="progressbar" aria-valuenow={intStep} aria-valuemax={arrSteps.length}>
          {arrSteps.map((objS, intI) => (
            <div key={objS.intId} style={{ display: 'flex', alignItems: 'center', flex: intI < arrSteps.length - 1 ? 1 : 'none' }}>
              <div className={`step ${intStep > objS.intId ? 'done' : intStep === objS.intId ? 'active' : ''}`}>
                <div className="step-circle">
                  {intStep > objS.intId ? '✓' : objS.intId}
                </div>
                <span className="step-label">{objS.strLabel}</span>
              </div>
              {intI < arrSteps.length - 1 && (
                <div className={`step-line ${intStep > objS.intId ? 'done' : ''}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {intStep === 1 && (
          <div className="form-body">
            <div className="form-section">
              <div className="form-section-title">
                <span className="section-icon">🖼</span> Profile Picture
              </div>
              <div className="avatar-picker">
                <div
                  className="avatar-preview"
                  style={{ background: arrAvatarColors[objForm.intAvatarColor] }}
                  aria-label="Avatar preview"
                >
                  {strInitials}
                </div>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    Choose an avatar color. A photo can be uploaded later.
                  </p>
                  <div className="avatar-colors">
                    {arrAvatarColors.map((strC, intI) => (
                      <div
                        key={intI}
                        className={`color-swatch ${objForm.intAvatarColor === intI ? 'selected' : ''}`}
                        style={{ background: strC }}
                        onClick={() => funcSetField('intAvatarColor', intI)}
                        role="radio"
                        aria-checked={objForm.intAvatarColor === intI}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">
                <span className="section-icon">👤</span> Basic Information
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="inp-firstName">First Name *</label>
                  <input
                    id="inp-firstName"
                    className={`form-input ${objErrors.strFirstName ? 'error' : ''}`}
                    type="text"
                    placeholder="e.g. Alex"
                    value={objForm.strFirstName}
                    onChange={e => funcSetField('strFirstName', e.target.value)}
                  />
                  {objErrors.strFirstName && <span className="form-error">{objErrors.strFirstName}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="inp-lastName">Last Name *</label>
                  <input
                    id="inp-lastName"
                    className={`form-input ${objErrors.strLastName ? 'error' : ''}`}
                    type="text"
                    placeholder="e.g. Rivera"
                    value={objForm.strLastName}
                    onChange={e => funcSetField('strLastName', e.target.value)}
                  />
                  {objErrors.strLastName && <span className="form-error">{objErrors.strLastName}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="inp-email">Email Address *</label>
                  <input
                    id="inp-email"
                    className={`form-input ${objErrors.strEmail ? 'error' : ''}`}
                    type="email"
                    placeholder="user@company.com"
                    value={objForm.strEmail}
                    onChange={e => funcSetField('strEmail', e.target.value)}
                  />
                  {objErrors.strEmail && <span className="form-error">{objErrors.strEmail}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="inp-phone">Phone Number</label>
                  <input
                    id="inp-phone"
                    className="form-input"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={objForm.strPhone}
                    onChange={e => funcSetField('strPhone', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="inp-dob">Date of Birth *</label>
                  <input
                    id="inp-dob"
                    className={`form-input ${objErrors.strDateOfBirth ? 'error' : ''}`}
                    type="date"
                    value={objForm.strDateOfBirth}
                    onChange={e => funcSetField('strDateOfBirth', e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                  {objErrors.strDateOfBirth && <span className="form-error">{objErrors.strDateOfBirth}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="inp-gender">Gender *</label>
                  <select
                    id="inp-gender"
                    className={`form-select ${objErrors.strGender ? 'error' : ''}`}
                    value={objForm.strGender}
                    onChange={e => funcSetField('strGender', e.target.value)}
                  >
                    <option value="">Select gender…</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                  {objErrors.strGender && <span className="form-error">{objErrors.strGender}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {intStep === 2 && (
          <div className="form-body">
            <div className="form-section">
              <div className="form-section-title">
                <span className="section-icon">🔑</span> Login Credentials
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="inp-username">Username *</label>
                  <input
                    id="inp-username"
                    className={`form-input ${objErrors.strUsername ? 'error' : ''}`}
                    type="text"
                    placeholder="e.g. john.doe"
                    value={objForm.strUsername}
                    onChange={e => funcSetField('strUsername', e.target.value.toLowerCase().replace(/\s+/g, '.'))}
                  />
                  {objErrors.strUsername && <span className="form-error">{objErrors.strUsername}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="inp-password">Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="inp-password"
                      className={`form-input ${objErrors.strPassword ? 'error' : ''}`}
                      type={boolShowPwd ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      value={objForm.strPassword}
                      onChange={e => funcSetField('strPassword', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => funcSetShowPwd(boolP => !boolP)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 15 }}
                    >
                      {boolShowPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                  {objErrors.strPassword && <span className="form-error">{objErrors.strPassword}</span>}
                  <PasswordStrength strPwd={objForm.strPassword} />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="inp-confirmPwd">Confirm Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="inp-confirmPwd"
                      className={`form-input ${objErrors.strConfirmPwd ? 'error' : ''}`}
                      type={boolShowConfirm ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={objForm.strConfirmPwd}
                      onChange={e => funcSetField('strConfirmPwd', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => funcSetShowConfirm(boolC => !boolC)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 15 }}
                    >
                      {boolShowConfirm ? '🙈' : '👁'}
                    </button>
                  </div>
                  {objErrors.strConfirmPwd && <span className="form-error">{objErrors.strConfirmPwd}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {intStep === 3 && (
          <div className="form-body">
            <div className="form-section">
              <div className="form-section-title">
                <span className="section-icon">🎭</span> User Role
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {arrDisplayRoles.map(objR => (
                  <div
                    key={objR.value}
                    onClick={() => funcSetField('strRole', objR.value)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${objForm.strRole === objR.value ? 'var(--purple)' : 'var(--border)'}`,
                      background: objForm.strRole === objR.value ? 'rgba(124,92,252,0.12)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{objR.label}</span>
                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0 }}>{objR.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {!['stock manager', 'manager'].includes((objForm.strRole || '').toLowerCase()) && (
              <div className="form-section" style={{ marginTop: '16px' }}>
                <div className="form-section-title">
                  <span className="section-icon">🏢</span> Assigned Branch
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" htmlFor="inp-branch">Select Branch *</label>
                  <select
                    id="inp-branch"
                    className="form-select"
                    value={objForm.strBranch}
                    onChange={e => funcSetField('strBranch', e.target.value)}
                    required
                  >
                    <option value="">Select a branch…</option>
                    {arrBranches.map(b => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  {objErrors.strBranch && <span className="form-error">{objErrors.strBranch}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4 */}
        {intStep === 4 && (
          <div className="form-body">
            <div className="review-card">
              <h4>Review User Information</h4>
              <p><strong>Name:</strong> {objForm.strFirstName} {objForm.strLastName}</p>
              <p><strong>Email:</strong> {objForm.strEmail}</p>
              <p><strong>Username:</strong> {objForm.strUsername}</p>
              <p><strong>Role:</strong> {objForm.strRole}</p>
              <p><strong>Branch:</strong> {objForm.strBranch}</p>
            </div>
          </div>
        )}

        {/* ---- Footer ---- */}
        <div className="modal-footer">
          <div className="footer-left">
            {intStep === 1
              ? <button className="btn-secondary" onClick={funcOnClose}>Cancel</button>
              : <button className="btn-secondary" onClick={funcHandleBack}>← Back</button>
            }
          </div>
          <div className="footer-right">
            {intStep < arrSteps.length
              ? <button className="btn-primary" onClick={funcHandleNext}>Next →</button>
              : <button className="btn-primary" onClick={funcHandleSubmit}>Submit User</button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// Section: Action Button Utility
// Renders small interactive buttons with icons for editing/deleting users.
function ActionBtn({ strIcon, strTip, funcOnClick }) {
  return (
    <button 
      type="button" 
      className="action-btn" 
      onClick={funcOnClick} 
      title={strTip}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '28px', 
        height: '28px', 
        borderRadius: 'var(--radius-sm)', 
        border: 'none', 
        background: 'rgba(255,255,255,0.03)', 
        color: 'var(--text-secondary)', 
        cursor: 'pointer', 
        transition: 'all 0.2s ease',
        padding: 0
      }}
    >
      <i className={`ti ti-${strIcon}`} style={{ fontSize: '14px' }}></i>
    </button>
  );
}

// Section: Edit User Modal
// Renders a popup modal containing standard user configuration inputs for updating user details.
export function EditUserModal({ user, funcOnClose, funcOnSave, arrRolesList = [], arrBranches = [] }) {
  const [strFull, funcSetFull] = useState(user.strFull || user.strName || "");
  const [strEmail, funcSetEmail] = useState(user.strEmail || "");
  const [strUsername, funcSetUsername] = useState(user.strUsername || "");
  const [strRole, funcSetRole] = useState(user.strRoleName || user.strRole || "Branch User");
  const [strBranch, funcSetBranch] = useState(user.strBranch || "");
  const [strStatus, funcSetStatus] = useState(user.strStatus || "Active");
  const [strPassword, funcSetPassword] = useState("");
  const [boolShowPwd, funcSetShowPwd] = useState(false);
  const [objErrors, funcSetErrors] = useState({});

  const funcHandleSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    if (!strFull.trim()) errors.strFull = 'Full name is required';
    if (!strEmail.trim()) errors.strEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strEmail)) errors.strEmail = 'Enter a valid email';
    if (!strUsername.trim()) errors.strUsername = 'Username is required';
    if (strPassword && strPassword.length < 8) errors.strPassword = 'Password must be at least 8 characters';

    if (Object.keys(errors).length > 0) {
      funcSetErrors(errors);
      return;
    }

    funcOnSave({
      ...user,
      strFull: strFull.trim(),
      strName: strFull.trim(),
      strEmail: strEmail.trim(),
      strUsername: strUsername.trim(),
      strRole: strRole,
      strRoleName: strRole,
      strBranch: strBranch,
      strStatus: strStatus,
      strPassword: strPassword.trim(),
    });
  };

  return (
    <div className="modal-overlay" id="edit-user-modal-overlay">
      <div className="modal" role="dialog" aria-modal="true" aria-label="Edit User" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2>✏️ Edit User Details</h2>
            <p>Modify account configurations and role access</p>
          </div>
          <button id="modal-close-btn" className="modal-close" onClick={funcOnClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={funcHandleSubmit}>
          <div className="form-body">
            <div className="form-section">
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className={`form-input ${objErrors.strFull ? 'error' : ''}`}
                    type="text"
                    value={strFull}
                    onChange={e => { funcSetFull(e.target.value); funcSetErrors(prev => { const objE = { ...prev }; delete objE.strFull; return objE; }); }}
                  />
                  {objErrors.strFull && <span className="form-error">{objErrors.strFull}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    className={`form-input ${objErrors.strEmail ? 'error' : ''}`}
                    type="email"
                    value={strEmail}
                    onChange={e => { funcSetEmail(e.target.value); funcSetErrors(prev => { const objE = { ...prev }; delete objE.strEmail; return objE; }); }}
                  />
                  {objErrors.strEmail && <span className="form-error">{objErrors.strEmail}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input
                    className={`form-input ${objErrors.strUsername ? 'error' : ''}`}
                    type="text"
                    value={strUsername}
                    onChange={e => { funcSetUsername(e.target.value.toLowerCase().replace(/\s+/g, '.')); funcSetErrors(prev => { const objE = { ...prev }; delete objE.strUsername; return objE; }); }}
                  />
                  {objErrors.strUsername && <span className="form-error">{objErrors.strUsername}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Assigned Role *</label>
                  <select
                    className="form-select"
                    value={(strRole === 'Stock Manager (Branch)' || strRole === 'Stock Manager(Branch)') ? 'Stock Manager' : strRole}
                    onChange={e => {
                      const newRole = e.target.value;
                      funcSetRole(newRole);
                      if (['stock manager', 'manager'].includes(newRole.toLowerCase())) {
                        funcSetBranch('Central Office');
                      }
                    }}
                  >
                    {arrRolesList.filter(r => r !== 'Stock Manager (Branch)' && r !== 'Stock Manager(Branch)').map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {!['stock manager', 'manager', 'stock manager(branch)', 'stock manager (branch)'].includes((strRole || '').toLowerCase()) && (
                  <div className="form-group">
                    <label className="form-label">Assigned Branch</label>
                    <select
                      className="form-select"
                      value={strBranch}
                      onChange={e => funcSetBranch(e.target.value)}
                    >
                      <option value="">Select a branch…</option>
                      {arrBranches.map(b => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Status *</label>
                  <select
                    className="form-select"
                    value={strStatus}
                    onChange={e => funcSetStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Change Password (leave blank to keep current)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className={`form-input ${objErrors.strPassword ? 'error' : ''}`}
                      type={boolShowPwd ? 'text' : 'password'}
                      placeholder="Enter new password"
                      value={strPassword}
                      onChange={e => { funcSetPassword(e.target.value); funcSetErrors(prev => { const objE = { ...prev }; delete objE.strPassword; return objE; }); }}
                    />
                    <button
                      type="button"
                      onClick={() => funcSetShowPwd(boolP => !boolP)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 15 }}
                    >
                      {boolShowPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                  {objErrors.strPassword && <span className="form-error">{objErrors.strPassword}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <div className="footer-left">
              <button type="button" className="btn-secondary" onClick={funcOnClose}>Cancel</button>
            </div>
            <div className="footer-right">
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Section: UsersPage Default Component
// Renders a grid view of all users with search, role filters, status switches, and creation features.
export default function UsersPage({ users: arrPropUsers, setUsers: funcPropSetUsers, rolesList = [], roleDescriptions = {}, branchesList = [], triggerToast }) {
  const [arrLocalUsers, funcSetLocalUsers] = useState([]);
  const [objSelectedUserForEdit, funcSetSelectedUserForEdit] = useState(null);
  const [boolShowEditModal, funcSetShowEditModal] = useState(false);
  const arrUsers = arrPropUsers || arrLocalUsers;
  const funcSetUsers = funcPropSetUsers || funcSetLocalUsers;
  const arrRolesList = rolesList;
  const objRoleDescriptions = roleDescriptions;

  const [arrBranches, setArrBranches] = useState([]);

  const fetchBranches = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/branches/");
      if (res.ok) {
        const data = await res.json();
        setArrBranches(data);
      }
    } catch (err) {
      console.error("Failed to fetch branches dynamically in UsersPage:", err);
    }
  };

  const [boolShowModal, funcSetShowModal] = useState(false);
  const [strSearchTerm, funcSetSearchTerm] = useState('');
  const [strRoleFilter, funcSetRoleFilter] = useState('');
  const [strStatusFilter, funcSetStatusFilter] = useState('');
  const [boolLoading, funcSetLoading] = useState(true);
  const [boolShowRoleFilterDropdown, funcSetShowRoleFilterDropdown] = useState(false);
  const [boolShowStatusFilterDropdown, funcSetShowStatusFilterDropdown] = useState(false);

  // Section: Click Outside Handlers
  // Closes filtering dropdowns when clicking anywhere else in the document window.
  useEffect(() => {
    const funcCloseAll = () => {
      funcSetShowRoleFilterDropdown(false);
      funcSetShowStatusFilterDropdown(false);
    };
    window.addEventListener('click', funcCloseAll);
    return () => window.removeEventListener('click', funcCloseAll);
  }, []);

  // Section: API Calls
  // funcFetchUsers loads all users from the backend service.
  const funcFetchUsers = async () => {
    try {
      const arrData = await objApi.funcGetUsers();
      const arrMapped = arrData.map(objU => {
        const strInitials = funcGetInitials(objU.strName);
        return {
          intId: objU.id,
          strInitials: strInitials,
          strUsername: objU.strUsername,
          strName: objU.strName,
          strFull: objU.strName,
          strRole: objU.strRoleName,
          strRoleName: objU.strRoleName,
          intRoleNum: arrRolesList.indexOf(objU.strRoleName) !== -1 ? arrRolesList.indexOf(objU.strRoleName) + 1 : 3,
          strBranch: objU.strBranch || "",
          strLastLogin: objU.dtLastLogin ? new Date(objU.dtLastLogin).toLocaleString(undefined, {
            day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
          }) : "Never",
          strStatus: objU.strStatus,
          strAvatarBg: 'rgba(124,92,252,0.15)',
          strAvatarColor: '#7c3aed',
          strEmail: objU.strEmail,
          strPhone: "+91 98765 00000",
          strJoinedDate: "10 Jun 2026",
          arrPermissions: objU.listPermissions || []
        };
      });
      funcSetUsers(arrMapped);
      funcSetLoading(false);
    } catch (err) {
      console.error("Failed to fetch users:", err);
      funcSetUsers([
        { intId: 1, strInitials: 'SC', strName: 'Sarah Connor', strFull: 'Sarah Connor', strUsername: 'sarah_c', strEmail: 'sarah.connor@cyberdyne.com', strRoleName: 'Admin', strRole: 'Admin', strStatus: 'Active', strAvatarBg: 'rgba(124,92,252,0.15)', strAvatarColor: '#7c3aed', strBranch: '', strLastLogin: 'Never' },
        { intId: 2, strInitials: 'JC', strName: 'John Connor', strFull: 'John Connor', strUsername: 'john_c', strEmail: 'john.connor@resistance.net', strRoleName: 'Stock Manager', strRole: 'Stock Manager', strStatus: 'Active', strAvatarBg: 'rgba(124,92,252,0.15)', strAvatarColor: '#7c3aed', strBranch: '', strLastLogin: 'Never' },
        { intId: 3, strInitials: 'MW', strName: 'Marcus Wright', strFull: 'Marcus Wright', strUsername: 'marcus_w', strEmail: 'marcus@projectangel.com', strRoleName: 'Branch User', strRole: 'Branch User', strStatus: 'Inactive', strAvatarBg: 'rgba(124,92,252,0.15)', strAvatarColor: '#7c3aed', strBranch: '', strLastLogin: 'Never' }
      ]);
      funcSetLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    if (!arrPropUsers) {
      funcFetchUsers();
    } else {
      funcSetLoading(false);
    }
  }, [arrPropUsers]);

  // funcHandleAddUser submits a POST request to add a new user to the backend.
  const funcHandleAddUser = async (objNewUserData) => {
    try {
      // Map legacy values back to correct Role Names, and handle custom roles
      let strFinalRole = objNewUserData.strRole;
      if (strFinalRole === 'admin') strFinalRole = 'Admin';
      if (strFinalRole === 'manager') strFinalRole = 'Stock Manager';
      if (strFinalRole === 'user') strFinalRole = 'Branch User';
      
      // Auto-assign Stock Manager (Branch) if they are a Stock Manager with a branch
      if (strFinalRole === 'Stock Manager' && objNewUserData.strBranch) {
        strFinalRole = 'Stock Manager(Branch)';
      }

      const objPayload = {
        strName: `${objNewUserData.strFirstName} ${objNewUserData.strLastName}`.trim(),
        strUsername: objNewUserData.strUsername,
        strEmail: objNewUserData.strEmail,
        strPassword: objNewUserData.strPassword,
        strRoleName: strFinalRole,
        strStatus: 'Active',
        strBranch: objNewUserData.strBranch
      };
      const objCreated = await objApi.funcCreateUser(objPayload);
      
      const strInitials = funcGetInitials(objCreated.strName);

      const objNewMappedUser = {
        intId: objCreated.id,
        strInitials: strInitials,
        strUsername: objCreated.strUsername,
        strName: objCreated.strName,
        strFull: objCreated.strName,
        strRole: objCreated.strRoleName,
        strRoleName: objCreated.strRoleName,
        intRoleNum: arrRolesList.indexOf(objCreated.strRoleName) !== -1 ? arrRolesList.indexOf(objCreated.strRoleName) + 1 : 3,
        strBranch: objCreated.strBranch || objNewUserData.strBranch || "",
        strLastLogin: "Never",
        strStatus: objCreated.strStatus || 'Active',
        strAvatarBg: 'rgba(124,92,252,0.15)',
        strAvatarColor: '#7c3aed',
        strEmail: objCreated.strEmail,
        strPhone: objNewUserData.strPhone || "+91 98765 00000",
        strJoinedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        arrPermissions: objCreated.listPermissions || []
      };

      funcSetUsers(prev => [objNewMappedUser, ...prev]);
      funcSetShowModal(false);
    } catch (err) {
      console.error("Failed to add user:", err);
    }
  };

  // funcHandleToggleStatus updates user profile status.
  const funcHandleToggleStatus = async (objUser) => {
    const strNextStatus = objUser.strStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await objApi.funcUpdateUser(objUser.intId, { strStatus: strNextStatus });
      funcSetUsers(prev => prev.map(u => u.intId === objUser.intId ? { ...u, strStatus: strNextStatus } : u));
      if (triggerToast) {
        triggerToast(`User "${objUser.strName}" status set to ${strNextStatus}.`);
      }
    } catch (err) {
      console.error(err);
      if (triggerToast) {
        triggerToast("Failed to update status on backend.", "error");
      }
    }
  };

  // funcHandleEditUser updates user credentials and configurations on backend and local state.
  const funcHandleEditUser = async (objUpdatedUserData) => {
    try {
      let strFinalRole = objUpdatedUserData.strRoleName;
      if (strFinalRole === 'Stock Manager' && objUpdatedUserData.strBranch) {
        strFinalRole = 'Stock Manager(Branch)';
      } else if ((strFinalRole === 'Stock Manager(Branch)' || strFinalRole === 'Stock Manager (Branch)') && !objUpdatedUserData.strBranch) {
        strFinalRole = 'Stock Manager';
      }

      const objPayload = {
        strName: objUpdatedUserData.strName,
        strUsername: objUpdatedUserData.strUsername,
        strEmail: objUpdatedUserData.strEmail,
        strRoleName: strFinalRole,
        strStatus: objUpdatedUserData.strStatus,
        strBranch: objUpdatedUserData.strBranch
      };
      if (objUpdatedUserData.strPassword) {
        objPayload.strPassword = objUpdatedUserData.strPassword;
      }
      
      const objUpdated = await objApi.funcUpdateUser(objUpdatedUserData.intId, objPayload);
      
      const strInitials = funcGetInitials(objUpdated.strName);

      const intRoleNum = arrRolesList.indexOf(objUpdated.strRoleName) !== -1 ? arrRolesList.indexOf(objUpdated.strRoleName) + 1 : 3;

      funcSetUsers(prev => prev.map(u => {
        if (u.intId === objUpdatedUserData.intId) {
          return {
            ...u,
            strInitials: strInitials,
            strUsername: objUpdated.strUsername,
            strName: objUpdated.strName,
            strFull: objUpdated.strName,
            strRole: objUpdated.strRoleName,
            strRoleName: objUpdated.strRoleName,
            intRoleNum: intRoleNum,
            strBranch: objUpdated.strBranch || "",
            strStatus: objUpdated.strStatus,
            strEmail: objUpdated.strEmail,
          };
        }
        return u;
      }));
      
      funcSetShowEditModal(false);
      funcSetSelectedUserForEdit(null);
      
      if (triggerToast) {
        triggerToast(`User "${objUpdated.strName}" updated successfully!`);
      }
    } catch (err) {
      console.error("Failed to update user:", err);
      if (triggerToast) {
        triggerToast("Failed to update user details.", "error");
      }
    }
  };

  // funcHandleDeleteUser removes user record from the backend service and locally.
  const funcHandleDeleteUser = async (intUserId) => {
    const objUserToDelete = arrUsers.find(u => u.intId === intUserId);
    if (!objUserToDelete) return;

    if (window.confirm(`Are you sure you want to delete user "${objUserToDelete.strFull || objUserToDelete.strName}"?`)) {
      try {
        await objApi.funcDeleteUser(intUserId);
        funcSetUsers(prev => prev.filter(u => u.intId !== intUserId));
        if (triggerToast) {
          triggerToast(`User "${objUserToDelete.strFull || objUserToDelete.strName}" deleted successfully.`, "warning");
        }
      } catch (err) {
        console.error("Failed to delete user:", err);
        if (triggerToast) {
          triggerToast("Failed to delete user.", "error");
        }
      }
    }
  };

  // arrFilteredUsers computes users matching filters.
  const arrFilteredUsers = useMemo(() => {
    return arrUsers.filter(u => {
      const boolMatchSearch = (u.strName || '').toLowerCase().includes(strSearchTerm.toLowerCase()) ||
                            (u.strUsername || '').toLowerCase().includes(strSearchTerm.toLowerCase()) ||
                            (u.strEmail || '').toLowerCase().includes(strSearchTerm.toLowerCase());
      const boolMatchRole = strRoleFilter === '' || u.strRoleName === strRoleFilter;
      const boolMatchStatus = strStatusFilter === '' || u.strStatus === strStatusFilter;
      return boolMatchSearch && boolMatchRole && boolMatchStatus;
    });
  }, [arrUsers, strSearchTerm, strRoleFilter, strStatusFilter]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>User Accounts</h1>
          <p className="page-sub" style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Create new accounts and configure roles and statuses.
          </p>
        </div>
        <button className="btn-add" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={async () => { await fetchBranches(); funcSetShowModal(true); }}>
          ➕ Add User
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search users..."
          className="form-input"
          style={{ maxWidth: '300px' }}
          value={strSearchTerm}
          onChange={e => funcSetSearchTerm(e.target.value)}
        />
        
        {/* Role Filter */}
        <div 
          className="select-filter" 
          style={{ position: 'relative', cursor: 'pointer', minWidth: '160px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
          onClick={(e) => { e.stopPropagation(); funcSetShowRoleFilterDropdown(s => !s); funcSetShowStatusFilterDropdown(false); }}
        >
          <span>{strRoleFilter || "All Roles"}</span>
          <i className="ti ti-chevron-down" style={{ fontSize: 12 }}></i>
          {boolShowRoleFilterDropdown && (
            <div className="dropdown-menu" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100 }}>
              <div 
                className={`dropdown-item${strRoleFilter === '' ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); funcSetRoleFilter(''); funcSetShowRoleFilterDropdown(false); }}
              >
                All Roles
              </div>
              {arrRolesList.map(strR => (
                <div 
                  key={strR}
                  className={`dropdown-item${strRoleFilter === strR ? ' active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); funcSetRoleFilter(strR); funcSetShowRoleFilterDropdown(false); }}
                >
                  {strR}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Filter */}
        <div 
          className="select-filter" 
          style={{ position: 'relative', cursor: 'pointer', minWidth: '160px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} 
          onClick={(e) => { e.stopPropagation(); funcSetShowStatusFilterDropdown(s => !s); funcSetShowRoleFilterDropdown(false); }}
        >
          <span>{strStatusFilter || "All Statuses"}</span>
          <i className="ti ti-chevron-down" style={{ fontSize: 12 }}></i>
          {boolShowStatusFilterDropdown && (
            <div className="dropdown-menu" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100 }}>
              <div 
                className={`dropdown-item${strStatusFilter === '' ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); funcSetStatusFilter(''); funcSetShowStatusFilterDropdown(false); }}
              >
                All Statuses
              </div>
              <div 
                className={`dropdown-item${strStatusFilter === 'Active' ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); funcSetStatusFilter('Active'); funcSetShowStatusFilterDropdown(false); }}
              >
                Active
              </div>
              <div 
                className={`dropdown-item${strStatusFilter === 'Inactive' ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); funcSetStatusFilter('Inactive'); funcSetShowStatusFilterDropdown(false); }}
              >
                Inactive
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-card" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table className="matrix-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', width: '80px' }}>User ID</th>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>User Details</th>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Username</th>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Assigned Role</th>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Assigned Branch</th>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '14px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>Last Login</th>
              <th style={{ padding: '14px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {boolLoading ? (
              <tr>
                <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users...</td>
              </tr>
            ) : arrFilteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td>
              </tr>
            ) : (
              arrFilteredUsers.map(objU => (
                <tr key={objU.intId} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>
                    #{objU.intId}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar-sm" style={{ background: 'var(--purple-mid)', color: '#fff', fontWeight: 'bold', display: 'grid', placeItems: 'center', width: '32px', height: '32px', borderRadius: '50%' }}>
                        {objU.strInitials || (objU.strName ? objU.strName.substring(0, 2).toUpperCase() : 'U')}
                      </div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '14px' }}>{objU.strName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{objU.strEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px', fontSize: '14px' }}>{objU.strUsername}</td>
                  <td style={{ padding: '14px' }}>
                    <span className={`role-badge ${objU.strRoleName === 'Admin' ? 'role-admin' : objU.strRoleName === 'Stock Manager' ? 'role-stock' : 'role-branch'}`}>
                      {objU.strRoleName}
                    </span>
                  </td>
                  <td style={{ padding: '14px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    {objU.strBranch}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <label className="matrix-switch">
                        <input 
                          type="checkbox" 
                          checked={objU.strStatus === 'Active'}
                          onChange={() => funcHandleToggleStatus(objU)}
                        />
                        <span className="matrix-slider"></span>
                      </label>
                      <span className={`status-badge ${objU.strStatus === 'Active' ? 'active' : 'inactive'}`}>
                        {objU.strStatus}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {objU.strLastLogin}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <ActionBtn 
                        strIcon="pencil" 
                        strTip="Edit User" 
                        funcOnClick={() => {
                          funcSetSelectedUserForEdit(objU);
                          funcSetShowEditModal(true);
                        }} 
                      />
                      <ActionBtn 
                        strIcon="trash" 
                        strTip="Delete User" 
                        funcOnClick={() => funcHandleDeleteUser(objU.intId)} 
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {boolShowModal && (
        <AddUserModal
          funcOnClose={() => funcSetShowModal(false)}
          funcOnSave={funcHandleAddUser}
          arrRolesList={arrRolesList}
          objRoleDescriptions={objRoleDescriptions}
          arrBranches={arrBranches}
        />
      )}

      {boolShowEditModal && objSelectedUserForEdit && (
        <EditUserModal
          user={objSelectedUserForEdit}
          funcOnClose={() => { funcSetShowEditModal(false); funcSetSelectedUserForEdit(null); }}
          funcOnSave={funcHandleEditUser}
          arrRolesList={arrRolesList}
          arrBranches={arrBranches}
        />
      )}
    </div>
  );
}
