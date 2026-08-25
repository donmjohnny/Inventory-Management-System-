import { useState } from "react";
import "./Login.css";

export const funcGetInitials = (strName) => {
  if (!strName || typeof strName !== 'string') return "?";
  const arrParts = strName.trim().split(/\s+/).filter(Boolean);
  if (arrParts.length === 0) return "?";
  if (arrParts.length === 1) return arrParts[0].substring(0, 2).toUpperCase();
  return (arrParts[0][0] + arrParts[1][0]).toUpperCase();
};

export default function Login({ funcOnLogin, arrUsers, strTheme, funcSetTheme }) {
  const [strUsername, setStrUsername] = useState("");
  const [strPassword, setStrPassword] = useState("");
  const [boolShowPassword, setBoolShowPassword] = useState(false);
  const [strError, setStrError] = useState("");
  const [boolShake, setBoolShake] = useState(false);
  const [boolIsLoading, setBoolIsLoading] = useState(false);

  // Sub-view: "login", "forgot", "verify", "reset", "success"
  const [strView, setStrView] = useState("login");
  const [strForgotEmail, setStrForgotEmail] = useState("");
  const [objTargetUser, setObjTargetUser] = useState(null);
  const [intTargetNumber, setIntTargetNumber] = useState(null);
  const [arrVerificationOptions, setArrVerificationOptions] = useState([]);
  const [boolShowGmailNotification, setBoolShowGmailNotification] = useState(false);
  const [boolShowGmailEmail, setBoolShowGmailEmail] = useState(false);
  const [strNewPassword, setStrNewPassword] = useState("");
  const [strConfirmNewPassword, setStrConfirmNewPassword] = useState("");
  const [boolShowNewPwd, setBoolShowNewPwd] = useState(false);
  const [boolShowConfirmNewPwd, setBoolShowConfirmNewPwd] = useState(false);
  
  // OTP Verification input and loading states
  const [strTypedCode, setStrTypedCode] = useState("");
  const [boolCodeIsVerifying, setBoolCodeIsVerifying] = useState(false);

  // Validate Login credentials against backend API
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setStrError("");
    setBoolShake(false);

    if (!strUsername.trim() || !strPassword.trim()) {
      triggerError("Please enter both username and password.");
      return;
    }

    setBoolIsLoading(true);

    try {
      const objRes = await fetch("http://127.0.0.1:8000/api/rbac/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: strUsername.trim(),
          password: strPassword.trim()
        })
      });

      const objData = await objRes.json();

      if (!objRes.ok) {
        setBoolIsLoading(false);
        triggerError(objData.error || "Incorrect credentials or authentication error.");
        return;
      }

      setBoolIsLoading(false);

      // Map backend response details to frontend user structure
      const arrPresetAvatars = [
        { strBg: '#ede9fe', strColor: '#5b21b6' },
        { strBg: '#fef3c7', strColor: '#92400e' },
        { strBg: '#dbeafe', strColor: '#1e40af' },
        { strBg: '#d1fae5', strColor: '#065f46' },
        { strBg: '#fce7f3', strColor: '#9d174d' }
      ];
      const objPreset = arrPresetAvatars[objData.id % arrPresetAvatars.length] || arrPresetAvatars[0];
      const strInitials = funcGetInitials(objData.strName);

      const mappedUser = {
        intId: objData.id,
        strInitials: strInitials,
        strUsername: objData.strUsername,
        strName: objData.strName,
        strFull: objData.strName,
        strRole: objData.strRoleName,
        strRoleName: objData.strRoleName,
        intRoleNum: objData.strRoleName === 'Admin' ? 1 : (objData.strRoleName === 'Stock Manager' ? 2 : 3),
        strBranch: objData.strBranch || "",
        strLastLogin: "Just now",
        strStatus: objData.strStatus,
        strAvatarBg: objPreset.strBg,
        strAvatarColor: objPreset.strColor,
        strEmail: objData.strEmail,
        strPhone: "+91 98765 00000",
        strJoinedDate: "10 Jun 2026",
        arrPermissions: objData.listPermissions
      };

      funcOnLogin(mappedUser);
    } catch (err) {
      setBoolIsLoading(false);
      triggerError("Network error: Cannot reach authentication server.");
      console.error("Authentication connection error:", err);
    }
  };

  const triggerError = (msg) => {
    setStrError(msg);
    setBoolShake(true);
    setTimeout(() => setBoolShake(false), 500);
  };

  // Perform backend password recovery simulation check
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!strForgotEmail.trim()) return;

    setBoolIsLoading(true);
    setStrError("");
    setStrTypedCode("");

    try {
      const objRes = await fetch("http://127.0.0.1:8000/api/rbac/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: strForgotEmail.trim()
        })
      });

      const objData = await objRes.json();

      if (!objRes.ok) {
        setBoolIsLoading(false);
        triggerError(objData.error || "User verification failed.");
        return;
      }

      setBoolIsLoading(false);
      setObjTargetUser(objData); // objData contains id, email, username, code, mail_sent

      // Use the verification code generated by the backend API if returned (only returned if mail failed/mock mode)
      const intNum = objData.code;
      setIntTargetNumber(intNum);

      // Go to verify view
      setStrView("verify");
      
      // Slide in Gmail notification after 1.5 seconds
      setTimeout(() => {
        setBoolShowGmailNotification(true);
      }, 1500);

    } catch (err) {
      setBoolIsLoading(false);
      triggerError("Network error: Cannot reach password recovery server.");
      console.error("Password recovery connection error:", err);
    }
  };

  const handleVerifyCodeSubmit = async (e) => {
    e.preventDefault();
    setStrError("");
    
    if (!strTypedCode.trim()) {
      triggerError("Please enter the 6-digit verification code.");
      return;
    }

    setBoolCodeIsVerifying(true);

    try {
      const objRes = await fetch("http://127.0.0.1:8000/api/rbac/verify-code/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: objTargetUser.id,
          code: strTypedCode.trim()
        })
      });

      const objData = await objRes.json();

      setBoolCodeIsVerifying(false);

      if (!objRes.ok) {
        triggerError(objData.error || "Incorrect verification code. Please check your email and try again.");
        return;
      }

      // Correct! Close Gmail window, hide notification, go to reset password view
      setBoolShowGmailEmail(false);
      setBoolShowGmailNotification(false);
      setStrView("reset");
      setStrError("");
      setStrNewPassword("");
      setStrConfirmNewPassword("");
      setStrTypedCode("");
    } catch (err) {
      setBoolCodeIsVerifying(false);
      triggerError("Network error: Cannot reach verification server.");
      console.error("Verification connection error:", err);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setStrError("");

    if (strNewPassword.length < 8) {
      triggerError("Password must be at least 8 characters long.");
      return;
    }
    if (strNewPassword !== strConfirmNewPassword) {
      triggerError("Passwords do not match.");
      return;
    }

    setBoolIsLoading(true);

    try {
      const objRes = await fetch(`http://127.0.0.1:8000/api/rbac/users/${objTargetUser.id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strPassword: strNewPassword.trim()
        })
      });

      if (!objRes.ok) {
        const objErr = await objRes.json();
        setBoolIsLoading(false);
        triggerError(objErr.error || "Password update failed.");
        return;
      }

      setBoolIsLoading(false);
      setStrView("success");
    } catch (err) {
      setBoolIsLoading(false);
      triggerError("Network error resetting password on backend.");
      console.error(err);
    }
  };


  return (
    <div className="login-screen">
      <div className="login-layout">
        
        {/* Left pane: Decorative Branding with Inventory Illustration */}
        <div className="login-brand-panel">
          <div className="brand-header">
            <div className="brand-logo-icon">
              <i className="ti ti-package"></i>
            </div>
            <div className="brand-details">
              <span className="brand-title">LeoInventory</span>
              <span className="brand-subtitle">Enterprise Manager</span>
            </div>
          </div>

          <div className="brand-illustration-container">
            {/* Custom SVG depicting actual concrete inventory items in a modern workspace layout */}
            <svg
              className="brand-graphic"
              viewBox="0 0 400 400"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Isometric Base concentric platforms */}
              <ellipse cx="200" cy="325" rx="140" ry="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" />
              <ellipse cx="200" cy="335" rx="155" ry="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="6 4" />

              {/* Connecting dashed routes representing supply chain link mappings */}
              <path d="M100 240 L200 250" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M200 250 L300 230" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M100 135 L200 210" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M140 90 L200 210" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M260 100 L200 210" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />

              {/* 1. Large Cardboard Package Box (Isometric projection in the center) */}
              <g transform="translate(0, 0)">
                {/* Left face */}
                <path d="M200 240 L150 215 L150 285 L200 310 Z" fill="rgba(255, 255, 255, 0.12)" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
                {/* Right face */}
                <path d="M200 240 L250 215 L250 285 L200 310 Z" fill="rgba(255, 255, 255, 0.18)" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
                {/* Top face */}
                <path d="M200 240 L150 215 L200 190 L250 215 Z" fill="rgba(255, 255, 255, 0.24)" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
                {/* Top packing tape */}
                <path d="M175 227 L225 203" stroke="rgba(255,255,255,0.4)" strokeWidth="6" strokeLinecap="round" />
                <path d="M150 215 L158 219" stroke="rgba(255,255,255,0.4)" strokeWidth="5" />
                <path d="M250 215 L242 219" stroke="rgba(255,255,255,0.4)" strokeWidth="5" />
                {/* Barcode shipping sticker on right face */}
                <rect x="210" y="242" width="26" height="16" fill="#ffffff" rx="1" />
                <line x1="214" y1="244" x2="214" y2="256" stroke="#1e1b4b" strokeWidth="1" />
                <line x1="217" y1="244" x2="217" y2="256" stroke="#1e1b4b" strokeWidth="2.5" />
                <line x1="221" y1="244" x2="221" y2="256" stroke="#1e1b4b" strokeWidth="1" />
                <line x1="224" y1="244" x2="224" y2="256" stroke="#1e1b4b" strokeWidth="1.5" />
                <line x1="227" y1="244" x2="227" y2="256" stroke="#1e1b4b" strokeWidth="2" />
                <line x1="231" y1="244" x2="231" y2="256" stroke="#1e1b4b" strokeWidth="1" />
              </g>

              {/* 2. Stack of A4 Paper Reams / Folders (Isometric, Left Side) */}
              <g>
                {/* Bottom Ream */}
                <path d="M80 230 L50 215 L50 245 L80 260 Z" fill="rgba(255, 255, 255, 0.12)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
                <path d="M80 230 L110 215 L110 245 L80 260 Z" fill="rgba(255, 255, 255, 0.18)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
                <path d="M80 230 L50 215 L80 200 L110 215 Z" fill="rgba(255, 255, 255, 0.22)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
                
                {/* Top Ream */}
                <path d="M85 210 L55 195 L55 225 L85 240 Z" fill="rgba(255, 255, 255, 0.15)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
                <path d="M85 210 L115 195 L115 225 L85 240 Z" fill="rgba(255, 255, 255, 0.22)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
                <path d="M85 210 L55 195 L85 180 L115 195 Z" fill="rgba(255, 255, 255, 0.28)" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
                {/* Packaging wrapper label on Top Ream */}
                <path d="M75 205 L65 200 L75 195 L85 200 Z" fill="rgba(139, 92, 246, 0.4)" stroke="#ffffff" strokeWidth="1" />
              </g>

              {/* 3. Printer Toner Cartridge (Far Left Back) */}
              <g>
                <rect x="75" y="115" width="50" height="26" rx="4" fill="rgba(255,255,255,0.15)" stroke="#ffffff" strokeWidth="2" />
                {/* Core developer roller (colorful drum) */}
                <line x1="75" y1="128" x2="125" y2="128" stroke="#8b5cf6" strokeWidth="4.5" />
                {/* Cartridge handles and side gears */}
                <path d="M75 120 L66 120 L66 130 H75" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                <path d="M125 120 L134 120 L134 130 H125" fill="none" stroke="#ffffff" strokeWidth="1.5" />
                <path d="M90 115 V107 H110 V115" fill="none" stroke="#ffffff" strokeWidth="2" />
              </g>

              {/* 4. Clipboard Requisition Checklist (Right Side) */}
              <g>
                {/* Board */}
                <rect x="270" y="170" width="60" height="85" rx="4" fill="rgba(255,255,255,0.1)" stroke="#ffffff" strokeWidth="2.5" />
                {/* Top Clip */}
                <path d="M292 170 H308 V162 H292 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="1" />
                {/* Sheet of paper */}
                <rect x="278" y="182" width="44" height="63" fill="rgba(255,255,255,0.2)" rx="1" stroke="rgba(255,255,255,0.3)" />
                {/* Checks and Lines */}
                <path d="M284 195 L287 198 L293 192" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="298" y1="195" x2="316" y2="195" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

                <path d="M284 210 L287 213 L293 207" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="298" y1="210" x2="316" y2="210" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

                <path d="M284 225 L287 228 L293 222" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="298" y1="225" x2="316" y2="225" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              </g>

              {/* 5. Ballpoint Pen & Whiteboard Marker (Crossed at front) */}
              <g>
                {/* Pen */}
                <line x1="145" y1="335" x2="255" y2="315" stroke="#3b82f6" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="245" y1="317" x2="255" y2="315" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="160" y1="332" x2="164" y2="322" stroke="#ffffff" strokeWidth="1.5" />

                {/* Marker */}
                <line x1="255" y1="335" x2="145" y2="315" stroke="#10b981" strokeWidth="6.5" strokeLinecap="round" />
                <line x1="145" y1="315" x2="165" y2="319" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" />
                <line x1="172" y1="320" x2="178" y2="321" stroke="#ef4444" strokeWidth="6" />
              </g>

              {/* 6. Floating Yellow & Pink Sticky Notes (Top Left and Top Right) */}
              {/* Yellow Note */}
              <g transform="translate(115, 70)">
                <path d="M0 0 H26 V26 H3 L0 23 Z" fill="rgba(253, 224, 71, 0.35)" stroke="#fde047" strokeWidth="1.5" />
                <path d="M0 23 H3 V26 Z" fill="#fde047" />
                <line x1="5" y1="7" x2="21" y2="7" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
                <line x1="5" y1="13" x2="18" y2="13" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
              </g>
              {/* Pink Note */}
              <g transform="translate(250, 85)">
                <path d="M0 0 H26 V26 H3 L0 23 Z" fill="rgba(244, 63, 94, 0.35)" stroke="#f43f5e" strokeWidth="1.5" />
                <path d="M0 23 H3 V26 Z" fill="#f43f5e" />
                <line x1="5" y1="7" x2="21" y2="7" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
                <line x1="5" y1="13" x2="18" y2="13" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
              </g>
            </svg>
          </div>

          <div className="brand-footer">
            <h1 className="brand-tagline">Track Stock. Manage Supply. Optimize Growth.</h1>
            <p className="brand-desc">
              Centralized controls for managing multi-branch requisitions, purchasing cycles, 
              real-time logistics tracking, and robust role-based security matrices.
            </p>
          </div>
        </div>

        {/* Right pane: Interactive Forms */}
        <div className="login-form-panel">
          
          {/* Theme Switcher */}
          <div className="login-theme-toggle">
            <button
              type="button"
              className="icon-btn"
              onClick={() => funcSetTheme(strTheme === "light" ? "dark" : "light")}
              title={`Switch to ${strTheme === "light" ? "Dark" : "Light"} Mode`}
            >
              <i className={`ti ti-${strTheme === "light" ? "moon" : "sun"}`} style={{ fontSize: 18 }}></i>
            </button>
          </div>

          <div className="login-card">
            
            {/* VIEW 1: Standard Login View */}
            {strView === "login" && (
              <>
                <div className="login-card-header">
                  <h2 className="login-card-title">Welcome back</h2>
                  <p className="login-card-subtitle">Please enter your system details to access the panels.</p>
                </div>

                <form onSubmit={handleLoginSubmit} className="login-form">
                  
                  {/* Alert error container */}
                  {strError && (
                    <div className={`login-error-alert ${boolShake ? "shake-animation" : ""}`}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: 16 }}></i>
                      <span>{strError}</span>
                    </div>
                  )}

                  <div className="login-field-group">
                    <label className="login-field-label" htmlFor="username">Username or Email</label>
                    <div className="login-input-wrapper">
                      <input
                        id="username"
                        type="text"
                        className="login-input"
                        placeholder="e.g. admin"
                        value={strUsername}
                        onChange={(e) => setStrUsername(e.target.value)}
                        required
                        disabled={boolIsLoading}
                      />
                      <i className="ti ti-user login-input-icon"></i>
                    </div>
                  </div>

                  <div className="login-field-group">
                    <div className="login-field-label">
                      <label htmlFor="password">Password</label>
                    </div>
                    <div className="login-input-wrapper">
                      <input
                        id="password"
                        type={boolShowPassword ? "text" : "password"}
                        className="login-input"
                        placeholder="••••••••••••"
                        value={strPassword}
                        onChange={(e) => setStrPassword(e.target.value)}
                        required
                        disabled={boolIsLoading}
                      />
                      <i className="ti ti-lock login-input-icon"></i>
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setBoolShowPassword(!boolShowPassword)}
                        tabIndex={-1}
                      >
                        <i className={`ti ti-eye${boolShowPassword ? "" : "-off"}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="login-options-row">
                    <label className="remember-me-label">
                      <input type="checkbox" className="remember-me-checkbox" />
                      Remember this machine
                    </label>
                    <button
                      type="button"
                      className="forgot-password-link"
                      onClick={() => {
                        setStrView("forgot");
                        setStrError("");
                        setBoolForgotSuccess(false);
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="btn-login-submit"
                    disabled={boolIsLoading}
                  >
                    {boolIsLoading ? (
                      <>
                        <i className="ti ti-loader" style={{ animation: "spin 1s linear infinite" }}></i>
                        Verifying Session...
                      </>
                    ) : (
                      <>
                        <span>Login</span>
                        <i className="ti ti-arrow-right"></i>
                      </>
                    )}
                  </button>
                </form>


              </>
            )}

            {/* VIEW 2: Forgot Password Recovery */}
            {strView === "forgot" && (
              <>
                <div className="login-card-header">
                  <h2 className="login-card-title">Reset Password</h2>
                  <p className="login-card-subtitle">
                    Provide your registered system username or email address below to initiate password recovery.
                  </p>
                </div>

                <form onSubmit={handleForgotSubmit} className="login-form">
                  {strError && (
                    <div className={`login-error-alert ${boolShake ? "shake-animation" : ""}`}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: 16 }}></i>
                      <span>{strError}</span>
                    </div>
                  )}

                  <div className="login-field-group">
                    <label className="login-field-label" htmlFor="forgot-email">Username or email</label>
                    <div className="login-input-wrapper">
                      <input
                        id="forgot-email"
                        type="text"
                        className="login-input"
                        placeholder="e.g. admin or admin@leoinventory.com"
                        value={strForgotEmail}
                        onChange={(e) => setStrForgotEmail(e.target.value)}
                        required
                        disabled={boolIsLoading}
                      />
                      <i className="ti ti-mail login-input-icon"></i>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-login-submit"
                    disabled={boolIsLoading || !strForgotEmail.trim()}
                  >
                    {boolIsLoading ? (
                      <>
                        <i className="ti ti-loader" style={{ animation: "spin 1s linear infinite" }}></i>
                        Validating User...
                      </>
                    ) : (
                      <>
                        <span>Validate Account</span>
                        <i className="ti ti-arrow-right"></i>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="forgot-password-link"
                    style={{ marginTop: "12px", textAlign: "center" }}
                    onClick={() => {
                      setStrView("login");
                      setStrError("");
                    }}
                  >
                    Return to login
                  </button>
                </form>
              </>
            )}

            {/* VIEW 3: Device verification - Number selection screen */}
            {strView === "verify" && objTargetUser && (
              <div style={{ textAlign: 'center', animation: 'loginFadeIn 0.3s ease-out' }}>
                <div className="login-card-header" style={{ marginBottom: 16 }}>
                  <h2 className="login-card-title">Verify Identity</h2>
                  <p className="login-card-subtitle" style={{ fontSize: 12.5 }}>
                    Enter the 6-digit verification code sent to your email address.
                  </p>
                </div>

                {strError && (
                  <div className={`login-error-alert ${boolShake ? "shake-animation" : ""}`} style={{ marginBottom: 16 }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: 16 }}></i>
                    <span>{strError}</span>
                  </div>
                )}

                {/* Local Demo Bypass Box */}
                {!objTargetUser.mail_sent && intTargetNumber && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1.5px dashed rgba(245, 158, 11, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    fontSize: '12px',
                    color: 'var(--text-main)',
                    marginBottom: '20px',
                    lineHeight: '1.45',
                    textAlign: 'left'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#d97706', fontWeight: 'bold', marginBottom: '4px' }}>
                      <i className="ti ti-alert-circle" style={{ fontSize: '15px' }}></i>
                      <span>Demo Mode (SMTP Not Setup)</span>
                    </div>
                    <span>For local testing, read the code below or check the mock Gmail inbox modal:</span>
                    <div style={{ fontSize: '24px', fontWeight: '800', textAlign: 'center', marginTop: '8px', letterSpacing: '3px', color: 'var(--purple-mid)' }}>
                      {intTargetNumber}
                    </div>
                  </div>
                )}

                <form onSubmit={handleVerifyCodeSubmit} className="login-form" style={{ marginBottom: 16 }}>
                  <div className="login-field-group">
                    <div className="login-input-wrapper">
                      <input
                        id="otp-code"
                        type="text"
                        className="login-input"
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        value={strTypedCode}
                        onChange={(e) => setStrTypedCode(e.target.value.replace(/\D/g, ""))}
                        required
                        disabled={boolCodeIsVerifying}
                        style={{
                          letterSpacing: strTypedCode ? '6px' : 'normal',
                          textAlign: 'center',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          paddingLeft: '16px',
                          paddingRight: '16px'
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-login-submit"
                    disabled={boolCodeIsVerifying || strTypedCode.length !== 6}
                  >
                    {boolCodeIsVerifying ? (
                      <>
                        <i className="ti ti-loader" style={{ animation: "spin 1s linear infinite" }}></i>
                        Verifying Code...
                      </>
                    ) : (
                      <>
                        <span>Verify OTP Code</span>
                        <i className="ti ti-shield-lock"></i>
                      </>
                    )}
                  </button>
                </form>

                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5, margin: '12px 0 16px 0' }}>
                  We sent a confirmation prompt to <strong>{objTargetUser.email}</strong>.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-login-submit"
                    style={{ background: 'none', border: '1px solid var(--purple-mid)', color: 'var(--purple-mid)', boxShadow: 'none' }}
                    onClick={() => setBoolShowGmailEmail(true)}
                  >
                    <i className="ti ti-mail-opened"></i>
                    <span>Open Mock Gmail Inbox</span>
                  </button>

                  <button
                    type="button"
                    className="btn-login-submit"
                    style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-main)', boxShadow: 'none' }}
                    onClick={() => {
                      setStrView("login");
                      setStrError("");
                      setBoolShowGmailNotification(false);
                      setBoolShowGmailEmail(false);
                    }}
                  >
                    Cancel and go back
                  </button>
                </div>
              </div>
            )}

            {/* VIEW 4: Change/Reset password screen */}
            {strView === "reset" && objTargetUser && (
              <>
                <div className="login-card-header">
                  <h2 className="login-card-title">New Password</h2>
                  <p className="login-card-subtitle">
                    Create a new secure password for <strong>@{objTargetUser.username}</strong>.
                  </p>
                </div>

                <form onSubmit={handleResetPasswordSubmit} className="login-form">
                  {strError && (
                    <div className={`login-error-alert ${boolShake ? "shake-animation" : ""}`}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: 16 }}></i>
                      <span>{strError}</span>
                    </div>
                  )}

                  <div className="login-field-group">
                    <label className="login-field-label" htmlFor="new-password">New Password</label>
                    <div className="login-input-wrapper">
                      <input
                        id="new-password"
                        type={boolShowNewPwd ? "text" : "password"}
                        className="login-input"
                        placeholder="Min 8 characters"
                        value={strNewPassword}
                        onChange={(e) => setStrNewPassword(e.target.value)}
                        required
                        disabled={boolIsLoading}
                      />
                      <i className="ti ti-lock login-input-icon"></i>
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setBoolShowNewPwd(!boolShowNewPwd)}
                        tabIndex={-1}
                      >
                        <i className={`ti ti-eye${boolShowNewPwd ? "" : "-off"}`}></i>
                      </button>
                    </div>
                  </div>

                  <div className="login-field-group">
                    <label className="login-field-label" htmlFor="confirm-new-password">Confirm Password</label>
                    <div className="login-input-wrapper">
                      <input
                        id="confirm-new-password"
                        type={boolShowConfirmNewPwd ? "text" : "password"}
                        className="login-input"
                        placeholder="Re-enter password"
                        value={strConfirmNewPassword}
                        onChange={(e) => setStrConfirmNewPassword(e.target.value)}
                        required
                        disabled={boolIsLoading}
                      />
                      <i className="ti ti-lock login-input-icon"></i>
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setBoolShowConfirmNewPwd(!boolShowConfirmNewPwd)}
                        tabIndex={-1}
                      >
                        <i className={`ti ti-eye${boolShowConfirmNewPwd ? "" : "-off"}`}></i>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-login-submit"
                    disabled={boolIsLoading || !strNewPassword || !strConfirmNewPassword}
                  >
                    {boolIsLoading ? (
                      <>
                        <i className="ti ti-loader" style={{ animation: "spin 1s linear infinite" }}></i>
                        Updating database...
                      </>
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <i className="ti ti-circle-check"></i>
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* VIEW 5: Password Updated Success screen */}
            {strView === "success" && (
              <div className="reset-success-card">
                <span className="reset-success-icon">
                  <i className="ti ti-circle-check"></i>
                </span>
                <h3 className="reset-success-title">Password Restored</h3>
                <p className="reset-success-text">
                  Your new credentials have been encrypted and saved in the PostgreSQL database.
                  You can now log in using your updated password.
                </p>
                <button
                  type="button"
                  className="btn-login-submit"
                  onClick={() => {
                    setStrView("login");
                    setStrForgotEmail("");
                    setStrNewPassword("");
                    setStrConfirmNewPassword("");
                    setStrError("");
                  }}
                >
                  Return to login
                </button>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ── MOCK GMAIL PUSH NOTIFICATION ── */}
      {boolShowGmailNotification && (
        <div className="gmail-push-notification" onClick={() => setBoolShowGmailEmail(true)}>
          <div className="gmail-icon-wrapper">
            <i className="ti ti-mail-opened"></i>
          </div>
          <div className="gmail-notif-body">
            <div className="gmail-notif-title">Gmail - LeoInventory Security</div>
            <div className="gmail-notif-text">Action required: Confirm your password recovery request.</div>
          </div>
          <button 
            type="button" 
            className="gmail-notif-close" 
            onClick={(e) => {
              e.stopPropagation();
              setBoolShowGmailNotification(false);
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── MOCK GMAIL EMAIL WINDOW MODAL ── */}
      {boolShowGmailEmail && objTargetUser && (
        <div className="gmail-modal-overlay" onClick={() => setBoolShowGmailEmail(false)}>
          <div className="gmail-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="gmail-modal-header">
              <div className="gmail-modal-header-left">
                <i className="ti ti-mail" style={{ fontSize: 16 }}></i>
                <span>Gmail Inbox – Security Alert</span>
              </div>
              <button className="gmail-modal-close-btn" onClick={() => setBoolShowGmailEmail(false)}>✕</button>
            </div>
            
            <div className="gmail-email-content">
              <div className="gmail-email-sender-row">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="gmail-sender-avatar">L</div>
                  <div className="gmail-sender-info">
                    <div className="gmail-sender-name">LeoInventory Security</div>
                    <div className="gmail-sender-email">security@leoinventory.com</div>
                  </div>
                </div>
                <div className="gmail-email-date">Just now</div>
              </div>
              
              <div className="gmail-email-subject">
                Verify your password recovery request (User: @{objTargetUser.username})
              </div>
              
              <div className="gmail-email-body">
                We received a request to restore your LeoInventory Enterprise account credentials.
                <br /><br />
                To proceed with your password reset, please enter the following 6-digit verification code on your sign-in browser screen:
              </div>
              
              <div className="gmail-verification-box">
                <p>Your LeoInventory OTP verification code:</p>
                <div style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '4px', color: '#ea4335', padding: '10px 0' }}>
                  {intTargetNumber || "******"}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-soft)', marginTop: '8px' }}>
                  If you did not request this, please ignore this email.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
