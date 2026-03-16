'use client';

import { useState } from 'react';
import { Lock, Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface ProcessingWarning {
  code: string;
  message: string;
  weekNumber?: number;
  rowNumber?: number;
}

interface ProcessingResponse {
  success?: boolean;
  message?: string;
  error?: string;
  summary?: {
    totalRows: number;
    validRows: number;
    processedWeeks?: number;
    warningsCount: number;
  };
  warnings?: ProcessingWarning[];
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [scoresTabName, setScoresTabName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [summary, setSummary] = useState<ProcessingResponse['summary'] | null>(null);
  const [warnings, setWarnings] = useState<ProcessingWarning[]>([]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: adminSecret }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate admin session');
      }

      setIsAuthenticated(true);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unknown authentication error',
      });
    }
  };

  const handleProcessScores = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setMessage(null);
    setSummary(null);
    setWarnings([]);

    try {
      const response = await fetch('/api/process-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scoresTabName,
        }),
      });

      const data = (await response.json()) as ProcessingResponse;

      if (!response.ok) {
        setSummary(data.summary ?? null);
        setWarnings(data.warnings ?? []);
        throw new Error(data.error || 'Failed to process scores');
      }

      setMessage({
        type: 'success',
        text: data.message || 'Scores processed successfully!',
      });
      setSummary(data.summary ?? null);
      setWarnings(data.warnings ?? []);
      setScoresTabName('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <Lock className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Admin Access</h1>
          <p className="text-gray-600 mb-6 text-center">Enter your admin secret to continue</p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="secret" className="block text-sm font-medium text-gray-700 mb-2">
                Admin Secret
              </label>
              <input
                id="secret"
                type="password"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter admin secret"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Access Admin Panel
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {message.text}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Process scores from Google Sheets and update ratings</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Process Scores</h2>
          </div>

          <form onSubmit={handleProcessScores} className="space-y-6">
            <div>
              <label htmlFor="tabName" className="block text-sm font-medium text-gray-700 mb-2">
                Scores Tab Name
              </label>
              <input
                id="tabName"
                type="text"
                value={scoresTabName}
                onChange={(e) => setScoresTabName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. Scores, Week1, week1"
                required
              />
              <p className="text-sm text-gray-500 mt-1">Enter the name of the tab containing the match scores.</p>
            </div>

            <button
              type="submit"
              disabled={processing}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Process Scores
                </>
              )}
            </button>
          </form>

          {message && (
            <div
              className={`mt-6 p-4 rounded-lg flex items-start gap-3 ${
                message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                  {message.type === 'success' ? 'Success!' : 'Error'}
                </p>
                <p className={`text-sm ${message.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>{message.text}</p>
              </div>
            </div>
          )}

          {summary && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Processing Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-slate-500">Total Rows</div>
                  <div className="font-semibold text-slate-900">{summary.totalRows}</div>
                </div>
                <div>
                  <div className="text-slate-500">Valid Rows</div>
                  <div className="font-semibold text-slate-900">{summary.validRows}</div>
                </div>
                <div>
                  <div className="text-slate-500">Processed Weeks</div>
                  <div className="font-semibold text-slate-900">{summary.processedWeeks ?? 0}</div>
                </div>
                <div>
                  <div className="text-slate-500">Warnings</div>
                  <div className="font-semibold text-slate-900">{summary.warningsCount}</div>
                </div>
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-900">Warnings</h3>
              </div>
              <ul className="space-y-2 text-sm text-amber-900">
                {warnings.slice(0, 8).map((warning, index) => (
                  <li key={`${warning.code}-${warning.rowNumber ?? index}`}>
                    {warning.message}
                  </li>
                ))}
              </ul>
              {warnings.length > 8 && (
                <p className="mt-3 text-xs text-amber-800">Showing the first 8 warnings out of {warnings.length}.</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mt-8 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">Instructions</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>Ensure your Google Sheet has three tabs: <strong>Scores</strong>, <strong>Players</strong>, and <strong>Ratings</strong>.</li>
            <li>The Scores tab should contain: WeekNumber, Player1, Player2, Player3, Player4, Score1, Score2.</li>
            <li>The Players tab should contain: PlayerName, Level, InitialMu, InitialSigma.</li>
            <li>The Ratings tab will be automatically created or updated by the system.</li>
            <li>Enter the exact name of your Scores tab. The value is case-sensitive.</li>
            <li>Rows with duplicate players, tied scores, missing names, or invalid week numbers are skipped and reported as warnings.</li>
          </ul>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to Leaderboard
          </a>
        </div>
      </div>
    </div>
  );
}
