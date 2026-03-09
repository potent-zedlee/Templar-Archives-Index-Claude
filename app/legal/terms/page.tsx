import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function TermsOfServicePage() {
  const lastUpdated = "January 20, 2025"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
      </div>

      {/* Legal Disclaimer */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>TEMPLATE NOTICE:</strong> This document is a template and requires review by a licensed attorney before use.
          Replace all [PLACEHOLDER] values with actual company information.
        </AlertDescription>
      </Alert>

      {/* Content */}
      <Card className="p-8">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Templar Archives Index (&quot;Service&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;), you accept and agree to be bound by the terms
            and provisions of this agreement. If you do not agree to these Terms of Service, please do not use this Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Templar Archives Index is a poker hand history archive platform that:
          </p>
          <ul>
            <li>Stores hand history data from public sources</li>
            <li>Provides search tools for poker players</li>
            <li>Facilitates community discussion and sharing</li>
          </ul>

          <h2>3. User Accounts</h2>
          <h3>3.1 Registration</h3>
          <p>
            To access certain features, you must register for an account using Google OAuth. You agree to:
          </p>
          <ul>
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Be responsible for all activities under your account</li>
          </ul>

          <h3>3.2 Account Termination</h3>
          <p>
            We reserve the right to suspend or terminate your account if you violate these Terms,
            engage in fraudulent activity, or for any other reason at our discretion.
          </p>

          <h2>4. Affiliate Links Disclosure</h2>
          <p className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
            <strong>FTC Disclosure:</strong> This Service contains affiliate links to poker sites and related services.
            We may earn a commission if you sign up or make purchases through our links, at no additional cost to you.
            Our recommendations are based on research, not on commission rates.
          </p>

          <h2>5. Intellectual Property Rights</h2>
          <h3>5.1 Content Ownership</h3>
          <p>
            Original video content (YouTube videos) remains the property of their respective copyright holders.
            We do not claim ownership of source videos.
          </p>

          <h3>5.2 Fair Use Policy</h3>
          <p>
            Our use of poker video content qualifies as Fair Use under U.S. Copyright Law (17 U.S.C. § 107) because:
          </p>
          <ul>
            <li><strong>Transformative Purpose:</strong> We convert video content into structured hand history data, a fundamentally different format</li>
            <li><strong>Educational Purpose:</strong> The Service is designed for poker education</li>
            <li><strong>Limited Use:</strong> We reference specific hands/clips, not entire broadcasts</li>
            <li><strong>No Market Harm:</strong> Our Service complements rather than replaces original video content</li>
          </ul>

          <h3>5.3 Tournament Brands & Logos</h3>
          <p>
            Tournament names, logos, and trademarks (WSOP, EPT, WPT, etc.) are property of their respective owners.
            Their use on this Service is for identification purposes only and does not imply endorsement or affiliation.
          </p>

          <h2>6. User-Generated Content</h2>
          <h3>6.1 Your Content Rights</h3>
          <p>
            You retain ownership of content you post (comments, forum posts, hand reviews). By posting, you grant us a
            worldwide, non-exclusive, royalty-free license to use, display, and distribute your content on the Service.
          </p>

          <h3>6.2 Content Standards</h3>
          <p>You agree NOT to post content that:</p>
          <ul>
            <li>Violates any law or regulation</li>
            <li>Infringes on intellectual property rights</li>
            <li>Contains hate speech, harassment, or threats</li>
            <li>Promotes illegal gambling or fraud</li>
            <li>Contains spam or commercial solicitation</li>
          </ul>

          <h2>7. Prohibited Uses</h2>
          <p>You agree NOT to:</p>
          <ul>
            <li>Use automated tools (bots, scrapers) without permission</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Upload viruses or malicious code</li>
            <li>Impersonate other users or entities</li>
            <li>Violate any applicable gambling laws in your jurisdiction</li>
          </ul>

          <h2>8. Privacy & Data Protection</h2>
          <p>
            Your use of the Service is also governed by our{" "}
            <a href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</a>,
            which is incorporated into these Terms by reference.
          </p>

          <h2>9. DMCA Copyright Policy</h2>
          <p>
            We respect intellectual property rights. If you believe content on our Service infringes your copyright,
            please see our{" "}
            <a href="/legal/dmca" className="text-primary hover:underline">DMCA Policy</a> for takedown procedures.
          </p>

          <h2>10. Disclaimers</h2>
          <h3>10.1 Service &quot;As Is&quot;</h3>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
            WE DO NOT GUARANTEE ACCURACY, COMPLETENESS, OR RELIABILITY OF HAND HISTORY DATA.
          </p>

          <h3>10.2 No Gambling Advice</h3>
          <p>
            This Service provides historical data ONLY. We do not provide gambling advice,
            recommendations, or predictions. Use at your own risk.
          </p>

          <h3>10.3 Third-Party Links</h3>
          <p>
            We are not responsible for the content, privacy policies, or practices of third-party websites (affiliate links, YouTube, etc.).
          </p>

          <h2>11. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR:
          </p>
          <ul>
            <li>Indirect, incidental, or consequential damages</li>
            <li>Loss of profits, data, or goodwill</li>
            <li>Service interruptions or errors in data</li>
            <li>Decisions made based on Service content</li>
          </ul>
          <p>
            OUR TOTAL LIABILITY SHALL NOT EXCEED $100 USD OR THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS, WHICHEVER IS GREATER.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold us harmless from claims arising from:
          </p>
          <ul>
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any third-party rights</li>
            <li>Content you post on the Service</li>
          </ul>

          <h2>13. Dispute Resolution</h2>
          <h3>13.1 Governing Law</h3>
          <p>
            These Terms shall be governed by the laws of [JURISDICTION], without regard to conflict of law provisions.
          </p>

          <h3>13.2 Arbitration</h3>
          <p>
            Any disputes arising from these Terms shall be resolved through binding arbitration in [CITY, STATE/COUNTRY],
            except where prohibited by law.
          </p>

          <h3>13.3 EU Users</h3>
          <p>
            If you are a consumer in the European Union, you have the right to resolve disputes through the EU Online Dispute Resolution platform.
          </p>

          <h2>14. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting.
            Continued use of the Service after changes constitutes acceptance of the new Terms.
          </p>

          <h2>15. Severability</h2>
          <p>
            If any provision of these Terms is found unenforceable, the remaining provisions shall continue in full force and effect.
          </p>

          <h2>16. Contact Information</h2>
          <p>
            For questions about these Terms, contact us at:
          </p>
          <ul>
            <li>Email: <a href="mailto:legal@templararchives.com">legal@templararchives.com</a></li>
            <li>Address: [COMPANY ADDRESS]</li>
          </ul>

          <hr className="my-8" />

          <p className="text-sm text-muted-foreground">
            By using Templar Archives Index, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
          </p>
        </div>
      </Card>
    </div>
  )
}
