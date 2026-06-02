"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [session, setSession] = useState(null); 
  const [activeTab, setActiveTab] = useState('user-portal'); 
  const [isSandbox, setIsSandbox] = useState(true);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('User');

  const [formData, setFormData] = useState({
    hoursClaimed: '',
    ticketingSystemId: '',
    deliverableSummary: ''
  });

  const [activeTickets, setActiveTickets] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);

  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('fits_session_user');
    const savedRole = localStorage.getItem('fits_session_role');
    if (savedUser && savedRole) {
      setSession({ email: savedUser, role: savedRole });
    }

    const savedSeconds = parseInt(localStorage.getItem('fits_timer_accumulated') || '0', 10);
    const timerStartTime = localStorage.getItem('fits_timer_start_time');

    if (timerStartTime) {
      const deltaSeconds = Math.floor((Date.now() - parseInt(timerStartTime, 10)) / 1000);
      setSecondsElapsed(savedSeconds + deltaSeconds);
      setIsTimerRunning(true);
    } else {
      setSecondsElapsed(savedSeconds);
    }
  }, []);

  useEffect(() => {
    if (isTimerRunning) {
      const hrs = Math.floor(secondsElapsed / 3600).toString().padStart(2, '0');
      const mins = Math.floor((secondsElapsed % 3600) / 60).toString().padStart(2, '0');
      const secs = (secondsElapsed % 60).toString().padStart(2, '0');
      document.title = `(⏱ ${hrs}:${mins}:${secs}) FITS Portal`;
    } else {
      document.title = "FITS Workspace Dashboard";
    }
  }, [secondsElapsed, isTimerRunning]);

  useEffect(() => {
    if (activeTab === 'admin-log' && session?.role === 'Admin') {
      fetchCompanyLogs();
    }
  }, [activeTab, session]);

  useEffect(() => {
    if (!session?.email) return;
    
    async function fetchTickets() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/overtime/tickets?email=${session.email}&isSandbox=${isSandbox}`);
        const data = await response.json();
        setActiveTickets(data);
      } catch (err) {
        console.error("Failed to load user tasks", err);
      }
    }
    fetchTickets();
  }, [session?.email, isSandbox]);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setSecondsElapsed(prev => {
          const currentAccumulated = parseInt(localStorage.getItem('fits_timer_accumulated') || '0', 10);
          const startTime = parseInt(localStorage.getItem('fits_timer_start_time') || '0', 10);
          if (startTime > 0) {
            return currentAccumulated + Math.floor((Date.now() - startTime) / 1000);
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning]);

  const handleStartTimer = () => {
    const now = Date.now().toString();
    localStorage.setItem('fits_timer_start_time', now);
    setIsTimerRunning(true);
  };

  const handlePauseTimer = () => {
    clearInterval(timerRef.current);
    const startTime = parseInt(localStorage.getItem('fits_timer_start_time') || '0', 10);
    if (startTime > 0) {
      const sessionSeconds = Math.floor((Date.now() - startTime) / 1000);
      const previousTotal = parseInt(localStorage.getItem('fits_timer_accumulated') || '0', 10);
      localStorage.setItem('fits_timer_accumulated', (previousTotal + sessionSeconds).toString());
    }
    localStorage.removeItem('fits_timer_start_time');
    setIsTimerRunning(false);
  };

  const applyTimerHours = () => {
    handlePauseTimer();
    const currentTotalSeconds = parseInt(localStorage.getItem('fits_timer_accumulated') || '0', 10);
    setFormData(prev => ({ ...prev, hoursClaimed: (currentTotalSeconds / 3600).toFixed(1) }));
  };

  const resetTimerClock = () => {
    localStorage.removeItem('fits_timer_start_time');
    localStorage.setItem('fits_timer_accumulated', '0');
    setIsTimerRunning(false);
    setSecondsElapsed(0);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword, role: 'User' })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('fits_session_user', data.email);
        localStorage.setItem('fits_session_role', data.role);
        setSession({ email: data.email, role: data.role });
        setLoginPassword('');
      } else {
        const errData = await response.json();
        setStatusMessage({ type: 'error', text: errData.message || 'Authentication rejected.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Network authentication gateway timeout.' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('fits_session_user');
    localStorage.removeItem('fits_session_role');
    setSession(null);
    setActiveTab('user-portal');
    resetTimerClock();
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/register?adminEmail=${session.email}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUserEmail, password: newUserPassword, role: newUserRole })
      });

      if (response.ok) {
        setStatusMessage({ type: 'success', text: `Account for ${newUserEmail} created successfully.` });
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('User');
      } else {
        const errData = await response.json();
        setStatusMessage({ type: 'error', text: errData.message || 'Registration failed.' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Failed to communicate with authentication registry server.' });
    }
  };

  const fetchCompanyLogs = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/overtime/all`);
      if (response.ok) {
        const data = await response.json();
        setAllLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!formData.hoursClaimed || parseFloat(formData.hoursClaimed) === 0) {
      setStatusMessage({ type: 'error', text: 'Please use the timer to track your hours before saving.' });
      return;
    }

    setStatusMessage({ type: 'info', text: 'Saving...' });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const submissionData = { 
        ...formData, 
        employeeEmail: session.email, 
        date: new Date().toISOString(),
        isSandbox 
      };

      const response = await fetch(`${apiUrl}/overtime/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        setStatusMessage({ type: 'success', text: isSandbox ? 'Sandbox test saved.' : 'Logged to GLPI successfully.' });
        setFormData({ hoursClaimed: '', ticketingSystemId: '', deliverableSummary: '' });
        resetTimerClock();
      } else {
        setStatusMessage({ type: 'error', text: 'Error processing submission.' });
      }
    } catch (error) {
      setStatusMessage({ type: 'error', text: 'Server connection disconnected.' });
    }
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-[#1e1e48]">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <img src="/fits-logo.png" alt="FITS" className="h-20 mx-auto object-contain mb-6" />
          <h2 className="text-3xl font-extrabold tracking-tight">Sign in to your Workspace</h2>
        </div>
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
            {statusMessage && (
              <div className="p-3 mb-4 text-sm font-medium bg-red-50 text-red-700 border border-red-100 rounded-lg">{statusMessage.text}</div>
            )}
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-1">Company Email</label>
                <input type="email" required className="block w-full rounded-lg border-slate-200 border p-3 focus:ring-2 focus:ring-[#00aef0]/50" placeholder="name@fits.net.za" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Password</label>
                <input type="password" required className="block w-full rounded-lg border-slate-200 border p-3 focus:ring-2 focus:ring-[#00aef0]/50" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              </div>
              <button type="submit" className="w-full bg-[#00aef0] hover:bg-[#0096d6] text-white py-3 rounded-xl font-bold text-lg shadow-lg shadow-[#00aef0]/20 transition-all">
                Sign In
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 font-sans text-[#1e1e48]">
      
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-6 mb-8">
        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
          <img src="/fits-logo.png" alt="FITS" className="h-14 object-contain" />
          <div className="text-left">
            <p className="text-xs font-bold tracking-wider uppercase text-slate-400">Account</p>
            <p className="text-sm font-black">{session.email} <span className="text-xs font-normal bg-slate-100 text-slate-600 px-2 py-0.5 rounded ml-1 uppercase tracking-tight">{session.role}</span></p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/60 px-4 py-2 rounded-xl transition-all border border-red-100">
          Sign Out
        </button>
      </div>

      <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-3 mb-10">
        <button onClick={() => { setActiveTab('user-portal'); setStatusMessage(null); }} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'user-portal' ? 'bg-[#1e1e48] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>⏱ Timer Tracker</button>
        {session.role === 'Admin' && (
          <>
            <button onClick={() => { setActiveTab('admin-log'); setStatusMessage(null); }} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'admin-log' ? 'bg-[#1e1e48] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>📁 Company Overtime Log</button>
            <button onClick={() => { setActiveTab('admin-users'); setStatusMessage(null); }} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'admin-users' ? 'bg-[#1e1e48] text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>👤 Add Employee Accounts</button>
          </>
        )}
      </div>

      {activeTab === 'user-portal' && (
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className={`p-4 flex items-center justify-between border-b transition-colors ${isSandbox ? 'bg-amber-50/60 border-amber-100' : 'bg-emerald-50/40 border-emerald-100'}`}>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider uppercase opacity-60">Environment</span>
              <span className={`text-sm font-black ${isSandbox ? 'text-amber-700' : 'text-emerald-700'}`}>{isSandbox ? 'SANDBOX TESTING' : 'LIVE PRODUCTION'}</span>
            </div>
            <button type="button" onClick={() => setIsSandbox(!isSandbox)} className="w-14 h-8 flex items-center rounded-full p-1 transition-colors bg-slate-200 relative">
              <div className={`w-6 h-6 rounded-full shadow-md absolute top-1 left-1 transform transition-transform ${isSandbox ? 'translate-x-0 bg-amber-500' : 'translate-x-6 bg-[#00aef0]'}`} />
            </button>
          </div>

          <div className="p-8 sm:p-10 space-y-6">
            
            {/* Simplified Timer Panel Header */}
            <div className="bg-slate-900 text-white rounded-xl p-5 text-center shadow-inner relative border border-slate-800">
              <span className="absolute top-3 left-4 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Timer</span>
              <div className="text-4xl font-mono font-bold tracking-wider my-2 text-[#00aef0]">
                {Math.floor(secondsElapsed / 3600).toString().padStart(2, '0')}:
                {Math.floor((secondsElapsed % 3600) / 60).toString().padStart(2, '0')}:
                {(secondsElapsed % 60).toString().padStart(2, '0')}
              </div>
              <div className="flex justify-center space-x-2 mt-3">
                {!isTimerRunning ? (
                  <button type="button" onClick={handleStartTimer} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">▶ Start Clock</button>
                ) : (
                  <button type="button" onClick={handlePauseTimer} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">⏸ Pause</button>
                )}
                <button type="button" onClick={applyTimerHours} disabled={secondsElapsed === 0 && !isTimerRunning} className="bg-[#00aef0] hover:bg-[#0096d6] text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-40">✔ Capture Time</button>
                <button type="button" onClick={resetTimerClock} className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">Reset</button>
              </div>
            </div>

            {statusMessage && (
              <div className={`p-4 rounded-lg text-sm font-medium border ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{statusMessage.text}</div>
            )}

            <form onSubmit={handleLogSubmit} className="space-y-6">
              {formData.hoursClaimed && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm flex justify-between items-center">
                  <span className="font-bold text-slate-600">Captured Duration:</span>
                  <span className="font-mono font-black text-[#1e1e48] bg-slate-200/60 px-3 py-1 rounded">{formData.hoursClaimed} Hours</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-[#1e1e48] mb-1.5">Linked GLPI Ticket</label>
                <select required className="block w-full rounded-lg border-slate-200 shadow-sm border p-3 bg-slate-50/50 text-sm appearance-none" value={formData.ticketingSystemId} onChange={e => setFormData({...formData, ticketingSystemId: e.target.value})}>
                  <option value="">-- Choose Assigned Task --</option>
                  {activeTickets.map((ticket, idx) => (
                    <option key={idx} value={ticket.id}>[{ticket.id}] {ticket.title}</option>
                  ))}
                </select>
              </div>

              {/* Simplified Field Header and Description Placement */}
              <div>
                <label className="block text-sm font-bold text-[#1e1e48] mb-1.5">Description</label>
                <textarea required className="block w-full rounded-lg border-slate-200 shadow-sm border p-3 bg-slate-50/50 text-sm" rows="3" placeholder="What did you work on during this time?" value={formData.deliverableSummary} onChange={e => setFormData({...formData, deliverableSummary: e.target.value})} />
              </div>

              <button type="submit" className={`w-full text-white py-3.5 px-4 rounded-xl font-bold text-lg shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                isSandbox ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-[#00aef0] hover:bg-[#0096d6] shadow-[#00aef0]/30'
              }`}>
                {isSandbox ? 'Log Sandbox Test' : 'Log to GLPI'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'admin-log' && session.role === 'Admin' && (
        <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden p-6 sm:p-8">
          <div className="mb-4">
            <h2 className="text-xl font-black tracking-tight">Centralised Overtime Ledger</h2>
            <p className="text-xs text-slate-500 mt-1">Real-time view of all historical logs across active operations.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-600 text-xs uppercase tracking-wider">
                  <th className="p-4">Employee</th>
                  <th className="p-4">Date Logged</th>
                  <th className="p-4 text-center">Hours</th>
                  <th className="p-4">GLPI ID</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-center">Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {allLogs.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-slate-400">No logs recorded inside system servers.</td></tr>
                ) : (
                  allLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">{log.employeeEmail}</td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                      <td className="p-4 text-center font-mono font-bold text-slate-800 bg-slate-50/40">{log.hoursClaimed}h</td>
                      <td className="p-4"><span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold font-mono">#{log.ticketingSystemId}</span></td>
                      <td className="p-4 max-w-xs truncate text-slate-600" title={log.deliverableSummary}>{log.deliverableSummary}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wide uppercase ${log.isSandbox ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>{log.isSandbox ? 'Sandbox' : 'Live'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'admin-users' && session.role === 'Admin' && (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-8 sm:p-10">
          <div className="mb-6">
            <h2 className="text-xl font-black tracking-tight">Add Employee Account</h2>
            <p className="text-xs text-slate-500 mt-1">Create log credentials for engineers or administrators.</p>
          </div>
          
          {statusMessage && (
            <div className={`p-4 mb-4 rounded-lg text-sm font-medium border ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{statusMessage.text}</div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#1e1e48] mb-1">Company Email Address</label>
              <input type="email" required className="block w-full rounded-lg border-slate-200 border p-3 focus:ring-2 focus:ring-[#00aef0]/50" placeholder="employee@fits.net.za" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#1e1e48] mb-1">Password</label>
              <input type="text" required className="block w-full rounded-lg border-slate-200 border p-3 focus:ring-2 focus:ring-[#00aef0]/50" placeholder="Set initial password string" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#1e1e48] mb-1">Account Role</label>
              <select className="block w-full rounded-lg border-slate-200 border p-3 bg-white text-sm" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                <option value="User">Regular Employee</option>
                <option value="Admin">Administrator</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-[#1e1e48] hover:bg-slate-800 text-white py-3 rounded-xl font-bold transition-all shadow-md mt-2">
              Create Account
            </button>
          </form>
        </div>
      )}
    </main>
  );
}