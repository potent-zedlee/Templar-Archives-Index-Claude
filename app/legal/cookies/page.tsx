import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function CookiePolicyPage() {
  const lastUpdated = "January 20, 2025"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
      </div>

      {/* Legal Disclaimer */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>IMPLEMENTATION REQUIRED:</strong> This policy describes cookies usage.
          You must implement a Cookie Consent banner (GDPR requirement) before launch.
        </AlertDescription>
      </Alert>

      {/* Content */}
      <Card className="p-8">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <h2>1. What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device when you visit our website.
            They help us recognize you, remember your preferences, and analyze usage patterns.
          </p>

          <h2>2. Types of Cookies We Use</h2>

          <h3>2.1 Essential Cookies (Always Active)</h3>
          <p>
            These cookies are necessary for the Service to function and cannot be disabled:
          </p>
          <table className="w-full border-collapse border border-border my-4">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2">Cookie Name</th>
                <th className="border border-border p-2">Purpose</th>
                <th className="border border-border p-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2"><code>sb-{process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1].split('.')[0]}-auth-token</code></td>
                <td className="border border-border p-2">Authentication (Supabase)</td>
                <td className="border border-border p-2">Session</td>
              </tr>
              <tr>
                <td className="border border-border p-2"><code>sb-refresh-token</code></td>
                <td className="border border-border p-2">Session persistence</td>
                <td className="border border-border p-2">30 days</td>
              </tr>
              <tr>
                <td className="border border-border p-2"><code>theme</code></td>
                <td className="border border-border p-2">Dark/Light mode preference</td>
                <td className="border border-border p-2">1 year</td>
              </tr>
            </tbody>
          </table>

          <h3>2.2 Analytics Cookies (Opt-Out Available)</h3>
          <p>
            These cookies help us understand how visitors use our Service:
          </p>
          <table className="w-full border-collapse border border-border my-4">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-2">Provider</th>
                <th className="border border-border p-2">Purpose</th>
                <th className="border border-border p-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border p-2">Vercel Analytics</td>
                <td className="border border-border p-2">Page views, performance metrics</td>
                <td className="border border-border p-2">Session</td>
              </tr>
              <tr>
                <td className="border border-border p-2">Vercel Speed Insights</td>
                <td className="border border-border p-2">Core Web Vitals monitoring</td>
                <td className="border border-border p-2">Session</td>
              </tr>
            </tbody>
          </table>

          <h3>2.3 Third-Party Cookies</h3>
          <p>
            When you interact with embedded content, third parties may set cookies:
          </p>
          <ul>
            <li>
              <strong>YouTube:</strong> When viewing embedded videos (CONSENT, VISITOR_INFO1_LIVE, YSC)
              - <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>
            </li>
            <li>
              <strong>Google OAuth:</strong> For authentication (G_ENABLED_IDPS, __Secure-1PSID)
              - <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer">Google Cookie Policy</a>
            </li>
          </ul>

          <h2>3. How to Manage Cookies</h2>

          <h3>3.1 Browser Settings</h3>
          <p>
            You can control cookies through your browser settings:
          </p>
          <ul>
            <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data</li>
            <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
            <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
            <li><strong>Edge:</strong> Settings → Cookies and site permissions</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Note: Blocking essential cookies will prevent you from logging in and using core features.
          </p>

          <h3>3.2 Opt-Out of Analytics</h3>
          <p>
            To opt out of Vercel Analytics, you can use:
          </p>
          <ul>
            <li>Browser extensions like uBlock Origin or Privacy Badger</li>
            <li>Your browser&apos;s &quot;Do Not Track&quot; setting</li>
          </ul>

          <h3>3.3 Withdraw Consent (EU Users)</h3>
          <p>
            You can change your cookie preferences at any time by clicking the &quot;Cookie Settings&quot; link in the footer
            or by clearing your browser cookies.
          </p>

          <h2>4. Cookie Consent (GDPR)</h2>
          <p>
            For users in the European Union:
          </p>
          <ul>
            <li>We display a cookie consent banner on your first visit</li>
            <li>You can choose which cookie categories to accept</li>
            <li>Essential cookies are always active (legitimate interest)</li>
            <li>Analytics cookies require your consent (opt-in)</li>
            <li>Your choice is stored in LocalStorage for 1 year</li>
          </ul>

          <h2>5. Updates to This Policy</h2>
          <p>
            We may update this Cookie Policy to reflect changes in technology or regulations.
            Check the &quot;Last updated&quot; date at the top of this page.
          </p>

          <h2>6. Contact Us</h2>
          <p>
            For questions about our use of cookies, contact us at:
          </p>
          <ul>
            <li>Email: <a href="mailto:privacy@templararchives.com">privacy@templararchives.com</a></li>
          </ul>

          <hr className="my-8" />

          <p className="text-sm text-muted-foreground">
            For more information on how we handle your personal data, see our{" "}
            <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </Card>
    </div>
  )
}
