import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
export default function PasswordRecoveryPage() {
  const reset = window.location.pathname === '/reset-password';
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [confirmation,setConfirmation] = useState('');
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [done,setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (reset && password !== confirmation) {setMessage('The passwords do not match.');return;}
    setBusy(true);setMessage('');
    try {
      const response = await apiRequest('POST',reset ? '/api/reset-password' : '/api/forgot-password',reset ? {token,password} : {email});
      const data = await response.json();setMessage(data.message);setDone(true);
      if (reset) window.history.replaceState(null,'','/reset-password');
    } catch (error) {
      const text = error instanceof Error ? error.message : '';
      try {setMessage(JSON.parse(text.slice(text.indexOf('{'))).error);} catch {setMessage('Unable to complete the request. Please try again.');}
    } finally {setBusy(false);}
  }
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <Helmet><title>{reset ? 'Reset password' : 'Password recovery'} | GTM Champion</title><meta name="robots" content="noindex,nofollow"/><meta name="referrer" content="no-referrer"/></Helmet>
    <section className="w-full max-w-md rounded-xl bg-white p-7 shadow-sm border space-y-5">
      <a href="/" className="font-semibold text-primary">GTM Champion</a>
      <h1 className="text-2xl font-bold">{reset ? 'Choose a new password' : 'Forgot your password?'}</h1>
      {!done && <form onSubmit={submit} className="space-y-4">
        {reset ? <><label className="block">New password<Input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)}/></label>
        <label className="block">Confirm password<Input type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirmation} onChange={event => setConfirmation(event.target.value)}/></label></>
        : <label className="block">Email address<Input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)}/></label>}
        <Button type="submit" className="w-full" disabled={busy || (reset && !token)}>{busy ? 'Please wait...' : reset ? 'Update password' : 'Send reset link'}</Button>
        {reset && !token && <p>Open the complete link from your reset email, or request a new one.</p>}
      </form>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <a href="/auth?mode=login" className="block text-sm text-primary underline">Back to sign in</a>
    </section>
  </main>;
}
