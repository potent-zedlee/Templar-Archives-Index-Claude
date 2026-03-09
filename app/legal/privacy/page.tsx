import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function PrivacyPolicyPage() {
  const lastUpdated = "January 20, 2025"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
      </div>

      {/* Legal Disclaimer */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>TEMPLATE NOTICE:</strong> This document is a template and requires review by a licensed attorney before use.
          Ensure GDPR, CCPA, and local data protection compliance.
        </AlertDescription>
      </Alert>

      {/* Content */}
      <Card className="p-8">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <h2>1. Introduction</h2>
          <p>
            Templar Archives Index (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) respects your privacy and is committed to protecting your personal data.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
          </p>
          <p>
            This policy applies to all users worldwide and complies with:
          </p>
          <ul>
            <li><strong>GDPR</strong> (General Data Protection Regulation - EU)</li>
            <li><strong>CCPA</strong> (California Consumer Privacy Act - USA)</li>
            <li><strong>Personal Information Protection Act</strong> (Korea)</li>
          </ul>

          <h2>2. Information We Collect</h2>

          <h3>2.1 Information You Provide</h3>
          <p>We collect information you voluntarily provide when you:</p>
          <ul>
            <li><strong>Create an Account:</strong> Email address, name, profile picture (via Google OAuth)</li>
            <li><strong>Update Your Profile:</strong> Nickname, avatar, bio, social links</li>
            <li><strong>Post Content:</strong> Comments, forum posts, hand reviews</li>
            <li><strong>Claim Player Profiles:</strong> Verification documents, social media links</li>
            <li><strong>Contact Us:</strong> Email correspondence, support tickets</li>
          </ul>

          <h3>2.2 Information Collected Automatically</h3>
          <p>When you use our Service, we automatically collect:</p>
          <ul>
            <li><strong>Usage Data:</strong> Pages visited, features used, search queries</li>
            <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
            <li><strong>Cookies:</strong> See our <a href="/legal/cookies" className="text-primary hover:underline">Cookie Policy</a></li>
            <li><strong>Analytics:</strong> Vercel Analytics, usage patterns</li>
          </ul>

          <h3>2.3 Third-Party Data</h3>
          <p>We may receive data from:</p>
          <ul>
            <li><strong>Google OAuth:</strong> Email, name, profile picture</li>
            <li><strong>YouTube API:</strong> Public video metadata (titles, thumbnails, descriptions)</li>
            <li><strong>Public Databases:</strong> Player statistics, tournament results (The Hendon Mob, etc.)</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use your data to:</p>

          <h3>3.1 Provide the Service</h3>
          <ul>
            <li>Create and manage your account</li>
            <li>Display your profile and contributions</li>
            <li>Enable hand history search</li>
            <li>Facilitate community features (comments, forums)</li>
          </ul>

          <h3>3.2 Improve the Service</h3>
          <ul>
            <li>Analyze usage patterns and performance</li>
            <li>Fix bugs and technical issues</li>
            <li>Develop new features</li>
          </ul>

          <h3>3.3 Communicate With You</h3>
          <ul>
            <li>Send account notifications (claim approvals, replies)</li>
            <li>Respond to support requests</li>
            <li>Send service updates (with opt-out option)</li>
          </ul>

          <h3>3.4 Legal Compliance</h3>
          <ul>
            <li>Comply with legal obligations</li>
            <li>Enforce our Terms of Service</li>
            <li>Protect against fraud and abuse</li>
          </ul>

          <h2>4. Legal Basis for Processing (GDPR)</h2>
          <p>For EU users, we process your data based on:</p>
          <ul>
            <li><strong>Consent:</strong> When you agree to cookies or marketing emails</li>
            <li><strong>Contract:</strong> To provide the Service you signed up for</li>
            <li><strong>Legitimate Interest:</strong> To improve the Service, prevent fraud</li>
            <li><strong>Legal Obligation:</strong> To comply with laws and regulations</li>
          </ul>

          <h2>5. Data Sharing and Disclosure</h2>
          <p>We do NOT sell your personal data. We may share data with:</p>

          <h3>5.1 Service Providers</h3>
          <ul>
            <li><strong>Supabase:</strong> Database hosting and authentication</li>
            <li><strong>Vercel:</strong> Hosting and analytics</li>
            <li><strong>Google (YouTube API):</strong> Video metadata retrieval</li>
          </ul>

          <h3>5.2 Legal Requirements</h3>
          <p>We may disclose data if required by law, court order, or government request.</p>

          <h3>5.3 Business Transfers</h3>
          <p>If we merge, are acquired, or sell assets, your data may be transferred to the new owner.</p>

          <h2>6. Your Rights</h2>

          <h3>6.1 GDPR Rights (EU Users)</h3>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your data</li>
            <li><strong>Rectification:</strong> Correct inaccurate data</li>
            <li><strong>Erasure:</strong> Request deletion (&quot;right to be forgotten&quot;)</li>
            <li><strong>Portability:</strong> Receive your data in machine-readable format</li>
            <li><strong>Object:</strong> Opt out of processing based on legitimate interest</li>
            <li><strong>Restrict:</strong> Limit how we use your data</li>
            <li><strong>Withdraw Consent:</strong> Opt out of cookies, marketing emails</li>
          </ul>

          <h3>6.2 CCPA Rights (California Users)</h3>
          <p>You have the right to:</p>
          <ul>
            <li><strong>Know:</strong> What personal information we collect and how it&apos;s used</li>
            <li><strong>Delete:</strong> Request deletion of your data</li>
            <li><strong>Opt-Out:</strong> &quot;Do Not Sell My Personal Information&quot; (we don&apos;t sell data)</li>
            <li><strong>Non-Discrimination:</strong> Equal service regardless of privacy choices</li>
          </ul>

          <h3>6.3 Korean Users</h3>
          <p>Under the Personal Information Protection Act, you can:</p>
          <ul>
            <li>Request access to your data</li>
            <li>Correct or delete your data</li>
            <li>Suspend data processing</li>
            <li>File a complaint with the Personal Information Protection Commission</li>
          </ul>

          <h3>6.4 Exercising Your Rights</h3>
          <p>
            To exercise any of these rights, email us at{" "}
            <a href="mailto:privacy@templararchives.com">privacy@templararchives.com</a>.
            We will respond within 30 days (GDPR) or 45 days (CCPA).
          </p>

          <h2>7. Data Retention</h2>
          <p>We retain your data for as long as:</p>
          <ul>
            <li>Your account is active</li>
            <li>Needed to provide the Service</li>
            <li>Required by law (e.g., tax records)</li>
          </ul>
          <p>
            After account deletion, we anonymize or delete your data within 90 days,
            except where retention is legally required.
          </p>

          <h2>8. Data Security</h2>
          <p>We implement security measures including:</p>
          <ul>
            <li>Encryption in transit (HTTPS/TLS)</li>
            <li>Encryption at rest (Supabase/PostgreSQL encryption)</li>
            <li>Access controls and authentication</li>
            <li>Regular security audits</li>
          </ul>
          <p>
            However, no system is 100% secure. Use strong passwords and enable two-factor authentication.
          </p>

          <h2>9. International Data Transfers</h2>
          <p>
            Your data may be transferred to and stored in countries outside your residence, including:
          </p>
          <ul>
            <li><strong>United States:</strong> Supabase, Vercel</li>
            <li><strong>South Korea:</strong> Supabase (Seoul Region)</li>
          </ul>
          <p>
            We use Standard Contractual Clauses (SCCs) approved by the European Commission for EU data transfers.
          </p>

          <h2>10. Children&apos;s Privacy</h2>
          <p>
            Our Service is not directed to children under 18 (or 16 in the EU).
            We do not knowingly collect data from children. If you believe we have collected data from a child,
            contact us immediately for deletion.
          </p>

          <h2>11. Cookies and Tracking</h2>
          <p>
            We use cookies for authentication, analytics, and preferences.
            See our <a href="/legal/cookies" className="text-primary hover:underline">Cookie Policy</a> for details.
          </p>

          <h2>12. Third-Party Links</h2>
          <p>
            Our Service contains links to third-party websites (YouTube, poker sites, etc.).
            We are not responsible for their privacy practices. Review their policies separately.
          </p>

          <h2>13. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy periodically. Changes will be posted with a new &quot;Last updated&quot; date.
            Continued use after changes constitutes acceptance.
          </p>

          <h2>14. Contact Us</h2>
          <p>
            For privacy questions, contact:
          </p>
          <ul>
            <li><strong>Data Protection Officer (DPO):</strong> [NAME]</li>
            <li><strong>Email:</strong> <a href="mailto:privacy@templararchives.com">privacy@templararchives.com</a></li>
            <li><strong>Address:</strong> [COMPANY ADDRESS]</li>
          </ul>

          <h2>15. Supervisory Authority</h2>
          <p>
            EU users have the right to lodge a complaint with their local data protection authority:
          </p>
          <ul>
            <li><strong>EU:</strong> <a href="https://edpb.europa.eu/about-edpb/board/members_en" target="_blank" rel="noopener noreferrer">European Data Protection Board</a></li>
            <li><strong>UK:</strong> <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer">Information Commissioner&apos;s Office (ICO)</a></li>
            <li><strong>Korea:</strong> <a href="https://www.pipc.go.kr" target="_blank" rel="noopener noreferrer">Personal Information Protection Commission</a></li>
          </ul>

          <hr className="my-8" />

          <p className="text-sm text-muted-foreground">
            By using Templar Archives Index, you acknowledge that you have read and understood this Privacy Policy.
          </p>
        </div>
      </Card>
    </div>
  )
}
