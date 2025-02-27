'use client';

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import type { Session } from '@supabase/supabase-js'

export default function AuthDebug() {
  // @ts-expect-error - Using any type for flexibility in debugging
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [cookieInfo, setCookieInfo] = useState<string[]>([])
  const [localStorageItems, setLocalStorageItems] = useState<Record<string, string>>({})
  // @ts-expect-error - Using any type for flexibility in debugging
  const [apiTestResult, setApiTestResult] = useState<any>(null)
  const [apiTesting, setApiTesting] = useState(false)
  const [showMiddlewareLogs, setShowMiddlewareLogs] = useState(false)
  const [middlewareLogs, setMiddlewareLogs] = useState<string[]>([])
  
  const { user, session, isLoading, error, refreshSession } = useAuth()
  const supabase = createClient()

  // Function to test a public API call
  const testPublicApi = async () => {
    try {
      setApiTesting(true)
      console.log('Testing public API call')
      
      const start = performance.now()
      const { data, error } = await supabase
        .from('guide_sections')
        .select('*')
        .limit(1)
      const end = performance.now()
      
      setApiTestResult({
        success: !error,
        data: data,
        error: error,
        timeMs: (end - start).toFixed(2),
        timestamp: new Date().toISOString()
      })
      
      console.log('API test result:', { data, error, timeMs: (end - start).toFixed(2) })
    } catch (e) {
      console.error('API test error:', e)
      setApiTestResult({
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error',
        timestamp: new Date().toISOString()
      })
    } finally {
      setApiTesting(false)
    }
  }

  // Function to get middleware logs from localStorage
  const getMiddlewareLogs = () => {
    try {
      const logs = JSON.parse(localStorage.getItem('middleware_logs') || '[]')
      setMiddlewareLogs(logs)
    } catch (e) {
      console.error('Error getting middleware logs:', e)
      setMiddlewareLogs(['Error loading logs'])
    }
  }

  // Function to clear middleware logs
  const clearMiddlewareLogs = () => {
    try {
      localStorage.setItem('middleware_logs', '[]')
      setMiddlewareLogs([])
    } catch (e) {
      console.error('Error clearing middleware logs:', e)
    }
  }

  // Effect to get session and storage information with a refresh interval
  useEffect(() => {
    const fetchData = async () => {
      // Get session
      const { data, error } = await supabase.auth.getSession()
      setSessionInfo({ data, error })
      
      // Get cookies
      const cookieString = document.cookie
      const cookies = cookieString ? cookieString.split(';').map(c => c.trim()) : []
      setCookieInfo(cookies)
      
      // Get localStorage items related to Supabase
      const items: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('supabase') || key.includes('sb-'))) {
          items[key] = localStorage.getItem(key) || ''
        }
      }
      setLocalStorageItems(items)
      
      // Get middleware logs
      getMiddlewareLogs()
    }
    
    // Fetch data immediately and then every 5 seconds
    fetchData()
    const interval = setInterval(fetchData, 5000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-gray-100 p-4 rounded-lg text-sm">
      <h2 className="text-lg font-bold mb-4">Auth Debug</h2>
      
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Auth Context</h3>
        <div className="bg-white p-2 rounded border overflow-x-auto">
          <pre>
            {JSON.stringify({
              user: user,
              isLoading,
              error,
              hasSession: session !== null
            }, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Session Info</h3>
        <div className="bg-white p-2 rounded border overflow-x-auto">
          <pre>
            {JSON.stringify(sessionInfo, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Cookies ({cookieInfo.length})</h3>
        <div className="bg-white p-2 rounded border overflow-x-auto">
          <pre>
            {JSON.stringify(cookieInfo, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold mb-2">
          Local Storage Items ({Object.keys(localStorageItems).length})
        </h3>
        <div className="bg-white p-2 rounded border overflow-x-auto">
          <pre>
            {JSON.stringify(localStorageItems, null, 2)}
          </pre>
        </div>
      </div>
      
      <div className="mb-4 space-x-2">
        <Button 
          onClick={testPublicApi} 
          disabled={apiTesting}
          variant="outline"
          size="sm"
        >
          {apiTesting ? 'Testing...' : 'Test Public API'}
        </Button>
        
        <Button 
          onClick={refreshSession} 
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          Refresh Session
        </Button>
        
        <Button 
          onClick={() => setShowMiddlewareLogs(!showMiddlewareLogs)}
          variant="outline"
          size="sm"
        >
          {showMiddlewareLogs ? 'Hide Middleware Logs' : 'Show Middleware Logs'}
        </Button>
        
        {showMiddlewareLogs && (
          <Button 
            onClick={clearMiddlewareLogs}
            variant="outline"
            size="sm"
          >
            Clear Logs
          </Button>
        )}
      </div>
      
      {apiTestResult && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">API Test Result</h3>
          <div className={`p-2 rounded border overflow-x-auto ${apiTestResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
            <pre>
              {JSON.stringify(apiTestResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
      
      {showMiddlewareLogs && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">
            Middleware Logs ({middlewareLogs.length})
          </h3>
          <div className="bg-black text-green-400 p-2 rounded border overflow-x-auto max-h-60 overflow-y-auto">
            {middlewareLogs.length === 0 ? (
              <p>No logs yet</p>
            ) : (
              middlewareLogs.map((log, index) => (
                <div key={index}>{log}</div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
} 